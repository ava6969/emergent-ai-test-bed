from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MessageCreate(BaseModel):
    text: str

# Single endpoint for messages
@api_router.post("/messages", response_model=Message)
async def create_message(input: MessageCreate):
    message_obj = Message(text=input.text)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = message_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.messages.insert_one(doc)
    return message_obj

@api_router.get("/messages", response_model=List[Message])
async def get_messages():
    # Exclude MongoDB's _id field from the query results
    messages = await db.messages.find({}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    
    # Convert ISO string timestamps back to datetime objects
    for msg in messages:
        if isinstance(msg['timestamp'], str):
            msg['timestamp'] = datetime.fromisoformat(msg['timestamp'])
    
    return messages

# ==================== TESTBED INTEGRATION ====================

# Import testbed components
try:
    from testbed_bridge import (
        storage,
        exa,
        persona_manager,
        goal_manager,
        organization_manager,
        create_generator_config,
        default_generator_config
    )
    print("✓ Testbed components initialized")
except Exception as e:
    print(f"⚠ Failed to initialize testbed: {e}")
    import traceback
    traceback.print_exc()
    storage = None
    persona_manager = None
    organization_manager = None

# Import generation jobs tracker
from generation_jobs import create_job, get_job, update_job, cleanup_old_jobs

# ==================== AI ENDPOINTS ====================

# Import OpenAI (for backwards compatibility)
try:
    from openai import OpenAI
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
except ImportError:
    openai_client = None
    print("OpenAI library not installed. AI features will be disabled.")

# AI Request Models
class ChatRequest(BaseModel):
    message: str
    conversation_id: str
    context: dict = {}

@api_router.post("/ai/chat")
async def ai_chat(request: ChatRequest):
    """Main conversational endpoint for AI assistant"""
    try:
        message_lower = request.message.lower()
        
        # Simple intent detection
        if any(word in message_lower for word in ["create persona", "generate persona", "make a persona", "persona"]):
            # Generate persona
            return await handle_persona_generation(request.message, request.conversation_id, request.context)
        elif any(word in message_lower for word in ["create goal", "generate goal", "test scenario", "goal"]):
            # Generate goal
            return await handle_goal_generation(request.message, request.conversation_id, request.context)
        else:
            # General conversation
            return {
                "message": "I can help you create personas and goals for testing your LangGraph agents. Try asking me to 'create a persona for customer support' or 'generate a goal for technical debugging'.",
                "actions": []
            }
    except Exception as e:
        print(f"Error in AI chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class GeneratePersonaRequest(BaseModel):
    """Request model for persona generation"""
    description: str
    message: Optional[str] = None  # Backwards compatibility
    conversation_id: str = "api"
    context: dict = {}
    
    # Generation settings
    organization_id: Optional[str] = None
    use_exa_enrichment: bool = False
    metadata_schema: Optional[dict] = None
    model: str = "gpt-4o-mini"
    temperature: float = 0.7
    max_tokens: int = 1500

@api_router.post("/ai/generate/persona")
async def generate_persona_endpoint(request: GeneratePersonaRequest):
    """Generate persona using testbed PersonaManager with structured output"""
    
    if not persona_manager:
        raise HTTPException(status_code=500, detail="Persona manager not initialized")
    
    try:
        # Use description or message (backwards compatibility)
        description = request.description or request.message
        if not description:
            raise HTTPException(status_code=400, detail="description or message required")
        
        # Update generator config if custom settings provided
        if request.model != "gpt-4o-mini" or request.temperature != 0.7 or request.max_tokens != 1500:
            custom_config = create_generator_config(
                model=request.model,
                temperature=request.temperature,
                max_tokens=request.max_tokens
            )
            persona_manager.generator = type(persona_manager.generator)(config=custom_config)
        
        # Generate persona using PersonaManager
        personas = await persona_manager.generate(
            count=1,
            requirements=description,
            organization_id=request.organization_id,
            use_real_context=request.use_exa_enrichment,
            metadata_schema=request.metadata_schema
        )
        
        if not personas:
            raise HTTPException(status_code=500, detail="No persona generated")
        
        persona = personas[0]
        
        # Convert to dict for response
        persona_dict = persona.model_dump()
        
        return {
            "message": f"✓ Created persona: {persona.name}",
            "generated_items": {
                "persona": persona_dict
            },
            "actions": [
                {"label": "Create Goal", "action": "create_goal", "variant": "default"},
                {"label": "View Details", "action": "view_details"},
                {"label": "Regenerate", "action": "regenerate"}
            ]
        }
        
    except Exception as e:
        print(f"Error generating persona: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/generate/persona/async")
async def generate_persona_async(request: GeneratePersonaRequest, background_tasks: BackgroundTasks):
    """Start persona generation and return job ID for polling"""
    
    if not persona_manager:
        raise HTTPException(status_code=500, detail="Persona manager not initialized")
    
    try:
        # Create job
        job = create_job()
        
        # Start generation in background
        background_tasks.add_task(
            run_persona_generation,
            job.id,
            request
        )
        
        return {
            "job_id": job.id,
            "status": "started",
            "message": "Generation started. Poll /api/ai/generate/status/{job_id} for progress"
        }
        
    except Exception as e:
        print(f"Error starting generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/ai/generate/status/{job_id}")
async def get_generation_status(job_id: str):
    """Get the current status of a generation job (for polling)"""
    
    job = get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job.to_dict()

async def run_persona_generation(job_id: str, request: GeneratePersonaRequest):
    """Background task that runs persona generation with progress updates"""
    import asyncio
    
    try:
        # Use description or message
        description = request.description or request.message
        if not description:
            update_job(job_id, status="failed", error="description or message required")
            return
        
        # Stage 1: Preparing
        update_job(job_id, status="running", stage="Preparing generation", progress=10)
        await asyncio.sleep(0.2)
        
        # Update generator config if custom settings provided
        if request.model != "gpt-4o-mini" or request.temperature != 0.7 or request.max_tokens != 1500:
            update_job(job_id, stage=f"Configuring {request.model}", progress=15)
            custom_config = create_generator_config(
                model=request.model,
                temperature=request.temperature,
                max_tokens=request.max_tokens
            )
            persona_manager.generator = type(persona_manager.generator)(config=custom_config)
            await asyncio.sleep(0.1)
        
        # Stage 2: Organization context (if applicable)
        if request.organization_id:
            update_job(job_id, stage="Loading organization context", progress=20)
            await asyncio.sleep(0.3)
        
        # Actual generation
        import time
        start_time = time.time()
        
        # Stage 3: Exa enrichment (if enabled) - happens during generation
        if request.use_exa_enrichment:
            update_job(job_id, stage=f"🔍 Searching Exa.ai for: '{description[:50]}...'", progress=25)
            await asyncio.sleep(0.2)
        
        try:
            personas = await persona_manager.generate(
                count=1,
                requirements=description,
                organization_id=request.organization_id,
                use_real_context=request.use_exa_enrichment,
                metadata_schema=request.metadata_schema
            )
            
            # If Exa was used, show completion
            if request.use_exa_enrichment:
                update_job(job_id, stage=f"✓ Exa enrichment complete, generating with AI...", progress=50)
                await asyncio.sleep(0.2)
            else:
                # Stage 4: Calling AI model
                update_job(job_id, stage=f"Calling AI model ({request.model})...", progress=40)
                
        except ValueError as e:
            # Handle Exa errors specifically
            if "Exa" in str(e):
                update_job(job_id, status="failed", error=str(e), stage="Exa enrichment failed")
                return
            raise
        
        end_time = time.time()
        generation_time = round(end_time - start_time, 2)
        
        # Stage 5: Processing response
        update_job(job_id, stage="Processing AI response", progress=85)
        await asyncio.sleep(0.2)
        
        if not personas:
            update_job(job_id, status="failed", error="No persona generated")
            return
        
        persona = personas[0]
        
        # Stage 6: Saving
        update_job(job_id, stage="Saving persona", progress=95)
        await asyncio.sleep(0.1)
        
        # Stage 7: Complete
        persona_dict = persona.model_dump()
        
        # Extract tags from metadata and add as top-level field for UI
        if "tags" in persona.metadata:
            persona_dict["tags"] = persona.metadata["tags"]
        
        result = {
            "message": f"✓ Created persona: {persona.name}",
            "generated_items": {
                "persona": persona_dict
            },
            "actions": [
                {"label": "Create Goal", "action": "create_goal", "variant": "default"},
                {"label": "View Details", "action": "view_details"},
                {"label": "Regenerate", "action": "regenerate"}
            ]
        }
        
        update_job(
            job_id,
            status="completed",
            stage="Complete",
            progress=100,
            result=result,
            generation_time=generation_time,
            completed_at=datetime.now(timezone.utc)
        )
        
    except Exception as e:
        print(f"Error in background generation: {e}")
        import traceback
        traceback.print_exc()
        update_job(job_id, status="failed", error=str(e), stage="Error occurred")

# SSE endpoint removed - using polling instead (nginx doesn't support SSE properly)

@api_router.post("/ai/generate/goal")
async def generate_goal_endpoint(request: ChatRequest):
    """Generate goal from description"""
    try:
        result = await handle_goal_generation(request.message, request.conversation_id, request.context)
        
        # If goal was generated, also save to DB
        if result.get("generated_items") and result["generated_items"].get("goal"):
            goal = result["generated_items"]["goal"]
            await db.goals.insert_one(goal)
        
        return result
    except Exception as e:
        print(f"Error generating goal: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_persona_generation(message: str, conversation_id: str, context: dict):
    """Generate a persona based on user description"""
    if not openai_client:
        return {
            "message": "AI generation is not available. Please configure OpenAI API key.",
            "actions": []
        }
    
    try:
        # Build prompt
        prompt = f"""Generate a persona for agent testing based on this request:

"{message}"

Create a realistic persona with:
1. Name (realistic, professional)
2. Background (2-3 sentences describing experience, skills, personality)

Format your response as JSON:
{{
  "name": "...",
  "background": "..."
}}
"""
        
        # Call LLM
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert at creating realistic test personas for AI agent evaluation. Always respond with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        # Parse response
        import json
        import re
        content = response.choices[0].message.content
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        
        if json_match:
            persona_data = json.loads(json_match.group())
        else:
            # Fallback
            persona_data = {
                "name": "Generated Persona",
                "background": content
            }
        
        # Create persona with UUID
        persona_id = str(uuid.uuid4())
        persona = {
            "id": persona_id,
            "name": persona_data.get("name", "Generated Persona"),
            "background": persona_data.get("background", "A test persona"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        return {
            "message": f"✓ Created persona: {persona['name']}",
            "generated_items": {
                "persona": persona
            },
            "actions": [
                {"label": "Create Goal", "action": "create_goal", "variant": "default"},
                {"label": "View Details", "action": "view_details"},
                {"label": "Regenerate", "action": "regenerate"}
            ]
        }
        
    except Exception as e:
        print(f"Error generating persona: {e}")
        return {
            "message": f"Sorry, I encountered an error generating the persona: {str(e)}",
            "actions": []
        }

async def handle_goal_generation(message: str, conversation_id: str, context: dict):
    """Generate a goal based on user description"""
    if not openai_client:
        return {
            "message": "AI generation is not available. Please configure OpenAI API key.",
            "actions": []
        }
    
    try:
        # Build prompt
        prompt = f"""Generate a test goal based on this request:

"{message}"

Create a realistic goal with:
1. Name (concise)
2. Objective (what should be achieved)
3. Success criteria (how to measure success)
4. Initial prompt (starting message for the conversation)
5. Max turns (reasonable number, typically 5-15)

Format your response as JSON:
{{
  "name": "...",
  "objective": "...",
  "success_criteria": "...",
  "initial_prompt": "...",
  "max_turns": 10
}}
"""
        
        # Call LLM
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert at creating test scenarios for AI agent evaluation. Always respond with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        # Parse response
        import json
        import re
        content = response.choices[0].message.content
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        
        if json_match:
            goal_data = json.loads(json_match.group())
        else:
            # Fallback
            goal_data = {
                "name": "Generated Goal",
                "objective": content,
                "success_criteria": "Goal completed successfully",
                "initial_prompt": message,
                "max_turns": 10
            }
        
        # Create goal with UUID
        goal_id = str(uuid.uuid4())
        goal = {
            "id": goal_id,
            "name": goal_data.get("name", "Generated Goal"),
            "objective": goal_data.get("objective", "Test objective"),
            "success_criteria": goal_data.get("success_criteria", "Success criteria"),
            "initial_prompt": goal_data.get("initial_prompt", message),
            "max_turns": goal_data.get("max_turns", 10),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        return {
            "message": f"✓ Created goal: {goal['name']}",
            "generated_items": {
                "goal": goal
            },
            "actions": [
                {"label": "Run Test", "action": "run_test", "variant": "default"},
                {"label": "View Details", "action": "view_details"},
                {"label": "Regenerate", "action": "regenerate"}
            ]
        }
        
    except Exception as e:
        print(f"Error generating goal: {e}")
        return {
            "message": f"Sorry, I encountered an error generating the goal: {str(e)}",
            "actions": []
        }

# ==================== CRUD ENDPOINTS ====================

# Persona Models
class PersonaCreate(BaseModel):
    name: str
    background: str
    organization_id: str = None
    tags: list[str] = []

class PersonaUpdate(BaseModel):
    name: str = None
    background: str = None
    organization_id: str = None
    tags: list[str] = None

@api_router.get("/personas")
async def list_personas(organization_id: str = None):
    """List all personas using PersonaManager"""
    if not persona_manager:
        raise HTTPException(status_code=500, detail="Persona manager not initialized")
    
    try:
        personas = await persona_manager.list(organization_id=organization_id)
        result = []
        for p in personas:
            persona_dict = p.model_dump()
            # Extract tags from metadata and add as top-level field for UI
            if "tags" in p.metadata:
                persona_dict["tags"] = p.metadata["tags"]
            result.append(persona_dict)
        return result
    except Exception as e:
        print(f"Error listing personas: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/personas")
async def create_persona(data: PersonaCreate):
    """Create a new persona manually using PersonaManager"""
    if not persona_manager:
        raise HTTPException(status_code=500, detail="Persona manager not initialized")
    
    try:
        persona = await persona_manager.create(
            name=data.name,
            background=data.background,
            organization_id=data.organization_id,
            metadata={"tags": data.tags} if data.tags else {}
        )
        return persona.model_dump()
    except Exception as e:
        print(f"Error creating persona: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/personas/{persona_id}")
async def update_persona(persona_id: str, data: PersonaUpdate):
    """Update a persona using PersonaManager"""
    if not persona_manager:
        raise HTTPException(status_code=500, detail="Persona manager not initialized")
    
    try:
        # Build update kwargs
        updates = {}
        if data.name is not None:
            updates["name"] = data.name
        if data.background is not None:
            updates["background"] = data.background
        if data.organization_id is not None:
            updates["organization_id"] = data.organization_id
        if data.tags is not None:
            updates["metadata"] = {"tags": data.tags}
        
        persona = await persona_manager.update(persona_id, **updates)
        return persona.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"Error updating persona: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/personas/{persona_id}")
async def delete_persona(persona_id: str, delete_trajectories: bool = False):
    """Delete a persona using PersonaManager"""
    if not persona_manager:
        raise HTTPException(status_code=500, detail="Persona manager not initialized")
    
    try:
        await persona_manager.delete(persona_id, delete_trajectories=delete_trajectories)
        return {"success": True}
    except Exception as e:
        print(f"Error deleting persona: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/personas")
async def delete_all_personas(delete_trajectories: bool = False):
    """Delete all personas using PersonaManager"""
    if not persona_manager:
        raise HTTPException(status_code=500, detail="Persona manager not initialized")
    
    try:
        # Get all personas and delete them one by one
        personas = await persona_manager.list()
        deleted_count = 0
        for persona in personas:
            await persona_manager.delete(persona.id, delete_trajectories=delete_trajectories)
            deleted_count += 1
        return {"success": True, "deleted_count": deleted_count}
    except Exception as e:
        print(f"Error deleting all personas: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Goal Models
class GoalCreate(BaseModel):
    name: str
    objective: str
    success_criteria: str
    initial_prompt: str
    max_turns: int = 10

class GoalUpdate(BaseModel):
    name: str = None
    objective: str = None
    success_criteria: str = None
    initial_prompt: str = None
    max_turns: int = None

@api_router.get("/goals")
async def list_goals():
    """List all goals"""
    goals = []
    cursor = db.goals.find()
    async for doc in cursor:
        doc['_id'] = str(doc['_id'])
        goals.append(doc)
    return goals

@api_router.post("/goals")
async def create_goal(data: GoalCreate):
    """Create a new goal"""
    goal = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "objective": data.objective,
        "success_criteria": data.success_criteria,
        "initial_prompt": data.initial_prompt,
        "max_turns": data.max_turns,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.goals.insert_one(goal)
    return goal

@api_router.put("/goals/{goal_id}")
async def update_goal(goal_id: str, data: GoalUpdate):
    """Update a goal"""
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.goals.update_one(
        {"id": goal_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    goal = await db.goals.find_one({"id": goal_id})
    goal['_id'] = str(goal['_id'])
    return goal

@api_router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str):
    """Delete a goal"""
    result = await db.goals.delete_one({"id": goal_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"success": True}

# Product Models
class ProductCreate(BaseModel):
    name: str
    description: str
    website: Optional[str] = None
    documents: List[Dict[str, str]] = []  # [{filename: "doc.md", content: "..."}]

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    documents: Optional[List[Dict[str, str]]] = None

@api_router.get("/products")
async def list_products():
    """List all products using FileStorage"""
    if not storage:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    
    try:
        products = await storage.list_products()
        return [p.model_dump() for p in products]
    except Exception as e:
        print(f"Error listing products: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/products")
async def create_product(data: ProductCreate):
    """Create a new product"""
    if not storage:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    
    try:
        from testbed.src.storage.models import Product
        product = Product(
            id=str(uuid.uuid4()),
            name=data.name,
            description=data.description,
            website=data.website,
            documents=data.documents,
            created_at=datetime.now(timezone.utc).isoformat()
        )
        await storage.save_product(product)
        return product.model_dump()
    except Exception as e:
        print(f"Error creating product: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, data: ProductUpdate):
    """Update a product"""
    if not storage:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    
    try:
        product = await storage.get_product(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Update fields
        if data.name is not None:
            product.name = data.name
        if data.description is not None:
            product.description = data.description
        if data.website is not None:
            product.website = data.website
        if data.documents is not None:
            product.documents = data.documents
        
        await storage.save_product(product)
        return product.model_dump()
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating product: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    """Delete a product"""
    if not storage:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    
    try:
        await storage.delete_product(product_id)
        return {"success": True}
    except Exception as e:
        print(f"Error deleting product: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/products")
async def delete_all_products():
    """Delete all products"""
    if not storage:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    
    try:
        products = await storage.list_products()
        deleted_count = 0
        for product in products:
            await storage.delete_product(product.id)
            deleted_count += 1
        return {"success": True, "deleted_count": deleted_count}
    except Exception as e:
        print(f"Error deleting all products: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Organization Models
class OrganizationCreate(BaseModel):
    name: str
    description: str
    type: str = None
    industry: str = None
    created_from_real_company: bool = False
    use_exa_search: bool = False

class OrganizationUpdate(BaseModel):
    name: str = None
    description: str = None
    type: str = None
    industry: str = None

@api_router.get("/organizations")
async def list_organizations():
    """List all organizations"""
    orgs = []
    cursor = db.organizations.find()
    async for doc in cursor:
        doc['_id'] = str(doc['_id'])
        orgs.append(doc)
    return orgs

@api_router.post("/organizations")
async def create_organization(data: OrganizationCreate):
    """Create a new organization"""
    org = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "description": data.description,
        "type": data.type,
        "industry": data.industry,
        "created_from_real_company": data.created_from_real_company,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.organizations.insert_one(org)
    return org

@api_router.put("/organizations/{org_id}")
async def update_organization(org_id: str, data: OrganizationUpdate):
    """Update an organization"""
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.organizations.update_one(
        {"id": org_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    org = await db.organizations.find_one({"id": org_id})
    org['_id'] = str(org['_id'])
    return org

@api_router.delete("/organizations/{org_id}")
async def delete_organization(org_id: str):
    """Delete an organization"""
    result = await db.organizations.delete_one({"id": org_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Organization not found")
    return {"success": True}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()