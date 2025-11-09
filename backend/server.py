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
        simulation_engine,
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
    count: int = Field(default=1, ge=1, le=10, description="Number of personas to generate (1-10)")
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
        
        # Generate persona(s) using PersonaManager
        personas = await persona_manager.generate(
            count=request.count,
            requirements=description,
            organization_id=request.organization_id,
            use_real_context=request.use_exa_enrichment,
            metadata_schema=request.metadata_schema
        )
        
        if not personas:
            raise HTTPException(status_code=500, detail="No persona generated")
        
        # Convert all personas to dict for response
        personas_dicts = [p.model_dump() for p in personas]
        
        # Return appropriate message based on count
        if request.count == 1:
            return {
                "message": f"✓ Created persona: {personas[0].name}",
                "generated_items": {
                    "persona": personas_dicts[0]
                },
                "actions": [
                    {"label": "Create Goal", "action": "create_goal", "variant": "default"},
                    {"label": "View Details", "action": "view_details"},
                    {"label": "Regenerate", "action": "regenerate"}
                ]
            }
        else:
            return {
                "message": f"✓ Created {len(personas)} personas: {', '.join(p.name for p in personas)}",
                "generated_items": {
                    "personas": personas_dicts
                },
                "actions": [
                    {"label": "View All", "action": "view_all"},
                    {"label": "Create Goals", "action": "create_goals"}
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
        
        # Update generator config if custom settings provided
        if request.model != "gpt-4o-mini" or request.temperature != 0.7 or request.max_tokens != 1500:
            update_job(job_id, stage=f"Configuring {request.model}", progress=15)
            custom_config = create_generator_config(
                model=request.model,
                temperature=request.temperature,
                max_tokens=request.max_tokens
            )
            persona_manager.generator = type(persona_manager.generator)(config=custom_config)
        
        # Stage 2: Organization context (if applicable)
        if request.organization_id:
            update_job(job_id, stage="Loading organization context", progress=20)
        
        # Actual generation
        import time
        start_time = time.time()
        
        # Stage 3: Exa enrichment (if enabled) - happens during generation
        if request.use_exa_enrichment:
            update_job(job_id, stage=f"🔍 Searching Exa.ai for: '{description[:50]}...'", progress=25)
        
        try:
            personas = await persona_manager.generate(
                count=request.count,
                requirements=description,
                organization_id=request.organization_id,
                use_real_context=request.use_exa_enrichment,
                metadata_schema=request.metadata_schema
            )
            
            # If Exa was used, show completion
            if request.use_exa_enrichment:
                update_job(job_id, stage="✓ Exa enrichment complete, generating with AI...", progress=50)
            else:
                # Stage 4: Calling AI model
                if request.count > 1:
                    update_job(job_id, stage=f"Generating {request.count} personas with {request.model}...", progress=40)
                else:
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
        
        if not personas:
            update_job(job_id, status="failed", error="No persona generated")
            return
        
        persona = personas[0]  # Keep for backwards compatibility with single persona
        
        # Stage 6: Saving
        if request.count > 1:
            update_job(job_id, stage=f"Saving {request.count} personas", progress=95)
        else:
            update_job(job_id, stage="Saving persona", progress=95)
        
        # Stage 7: Complete
        personas_dicts = [p.model_dump() for p in personas]
        
        # Extract tags from metadata for all personas
        for i, p in enumerate(personas):
            if "tags" in p.metadata:
                personas_dicts[i]["tags"] = p.metadata["tags"]
        
        # Return appropriate result based on count
        if request.count == 1:
            result = {
                "message": f"✓ Created persona: {persona.name}",
                "generated_items": {
                    "persona": personas_dicts[0]
                },
                "actions": [
                    {"label": "Create Goal", "action": "create_goal", "variant": "default"},
                    {"label": "View Details", "action": "view_details"},
                    {"label": "Regenerate", "action": "regenerate"}
                ]
            }
        else:
            result = {
                "message": f"✓ Created {len(personas)} personas: {', '.join(p.name for p in personas)}",
                "generated_items": {
                    "personas": personas_dicts
                },
                "actions": [
                    {"label": "View All", "action": "view_all"},
                    {"label": "Create Goals", "action": "create_goals"}
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
# Old goal generation endpoint removed - now using AI-powered generation below

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
class GoalGenerateRequest(BaseModel):
    """Request model for AI goal generation"""
    persona_ids: List[str] = []  # Optional persona selection
    product_id: Optional[str] = None  # Optional product context
    difficulty: str = "medium"  # easy, medium, hard, expert
    max_turns_override: Optional[int] = None  # Override AI-suggested max_turns
    organization_id: Optional[str] = None
    count: int = 1  # Number of goals to generate

class GoalCreate(BaseModel):
    name: str
    objective: str
    success_criteria: str
    initial_prompt: str
    max_turns: int = 10
    agent_ids: List[str] = []
    difficulty: Optional[str] = None
    product_id: Optional[str] = None

class GoalUpdate(BaseModel):
    name: Optional[str] = None
    objective: Optional[str] = None
    success_criteria: Optional[str] = None
    initial_prompt: Optional[str] = None
    max_turns: Optional[int] = None

# AI Goal Generation (Async with polling)
@api_router.post("/ai/generate/goal/async")
async def generate_goal_async(request: GoalGenerateRequest, background_tasks: BackgroundTasks):
    """Start async goal generation with polling support"""
    if not goal_manager:
        raise HTTPException(status_code=500, detail="Goal manager not initialized")
    
    # Create job
    job = create_job()
    update_job(job.id, status="queued", stage="Initializing goal generation", progress=0)
    
    # Start background task
    background_tasks.add_task(generate_goal_background, job.id, request)
    
    return {
        "job_id": job.id,
        "status": "queued",
        "message": "Goal generation started. Poll /api/ai/jobs/{job_id} for progress"
    }

async def generate_goal_background(job_id: str, request: GoalGenerateRequest):
    """Background task for goal generation with progress tracking"""
    import asyncio
    
    try:
        # Stage 1: Load context
        update_job(job_id, stage="Loading product documentation...", progress=10)
        
        product_context = ""
        if request.product_id and storage:
            product = await storage.get_product(request.product_id)
            if product:
                product_context = f"\n\n=== Product Context: {product.name} ===\n"
                product_context += f"Description: {product.description}\n"
                if product.documents:
                    product_context += f"\nDocumentation ({len(product.documents)} files):\n"
                    for doc in product.documents[:5]:
                        product_context += f"\n--- {doc['filename']} ---\n"
                        product_context += doc['content'][:500] + "...\n"
        
        # Stage 2: Load persona context
        update_job(job_id, stage="Loading persona context...", progress=20)
        
        # Build requirements
        requirements = f"Difficulty: {request.difficulty}"
        if product_context:
            requirements += product_context
        
        # Stage 3: AI Generation (this will make 10+ LLM calls and take 60-90 seconds)
        goal_count_text = f"{request.count} goal{'s' if request.count > 1 else ''}"
        update_job(job_id, stage=f"🤖 AI generating {goal_count_text} (analyzing context, defining objectives)...", progress=30)
        
        import time
        start_time = time.time()
        
        # This is a blocking call that makes multiple LLM requests internally
        goals = await goal_manager.generate(
            count=request.count,
            persona_ids=request.persona_ids or [],
            organization_id=request.organization_id,
            requirements=requirements,
            use_real_context=False,
            complexity=request.difficulty
        )
        
        if not goals:
            update_job(job_id, status="failed", error="Goal generation failed - no goals returned")
            return
        
        # Save all generated goals
        for goal in goals:
            # Override max_turns if specified
            if request.max_turns_override:
                goal.max_turns = request.max_turns_override
            
            # Store difficulty and product_id in metadata
            if not goal.metadata:
                goal.metadata = {}
            goal.metadata["difficulty"] = request.difficulty
            if request.product_id:
                goal.metadata["product_id"] = request.product_id
            
            # Save to storage
            await storage.save_goal(goal)
        
        end_time = time.time()
        generation_time = round(end_time - start_time, 2)
        
        # Complete
        goal_names = [g.name for g in goals]
        goal_count_text = f"{len(goals)} goal{'s' if len(goals) > 1 else ''}"
        update_job(
            job_id,
            status="completed",
            stage="Goal generation complete",
            progress=100,
            result={
                "message": f"✓ Created {goal_count_text}: {', '.join(goal_names)}",
                "goals": [g.model_dump() for g in goals],
                "generation_time": generation_time
            }
        )
        
    except Exception as e:
        print(f"Error in goal generation: {e}")
        import traceback
        traceback.print_exc()
        update_job(job_id, status="failed", error=str(e), stage="Generation failed")

@api_router.get("/goals")
async def list_goals():
    """List all goals using GoalManager"""
    if not storage:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    
    try:
        goals = await storage.list_goals()
        result = []
        for g in goals:
            goal_dict = g.model_dump()
            # Extract difficulty and product_id from metadata
            if "difficulty" in g.metadata:
                goal_dict["difficulty"] = g.metadata["difficulty"]
            if "product_id" in g.metadata:
                goal_dict["product_id"] = g.metadata["product_id"]
            result.append(goal_dict)
        return result
    except Exception as e:
        print(f"Error listing goals: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/goals")
async def create_goal(data: GoalCreate):
    """Create a new goal manually"""
    if not storage:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    
    try:
        from testbed.src.models.goal_config import Goal
        
        goal = Goal(
            id=str(uuid.uuid4()),
            name=data.name,
            objective=data.objective,
            success_criteria=data.success_criteria,
            agent_ids=data.agent_ids or [],
            initial_prompt=data.initial_prompt,
            max_turns=data.max_turns,
            metadata={
                "difficulty": data.difficulty,
                "product_id": data.product_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        )
        await storage.save_goal(goal)
        return goal.model_dump()
    except Exception as e:
        print(f"Error creating goal: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/goals/{goal_id}")
async def update_goal(goal_id: str, data: GoalUpdate):
    """Update a goal"""
    if not storage:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    
    try:
        goal = await storage.get_goal(goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        # Update fields
        if data.name is not None:
            goal.name = data.name
        if data.objective is not None:
            goal.objective = data.objective
        if data.success_criteria is not None:
            goal.success_criteria = data.success_criteria
        if data.initial_prompt is not None:
            goal.initial_prompt = data.initial_prompt
        if data.max_turns is not None:
            goal.max_turns = data.max_turns
        
        await storage.save_goal(goal)
        return goal.model_dump()
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating goal: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str):
    """Delete a goal"""
    if not storage:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    
    try:
        await storage.delete_goal(goal_id)
        return {"success": True}
    except Exception as e:
        print(f"Error deleting goal: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/goals")
async def delete_all_goals():
    """Delete all goals"""
    if not storage:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    
    try:
        goals = await storage.list_goals()
        deleted_count = 0
        for goal in goals:
            await storage.delete_goal(goal.id)
            deleted_count += 1
        return {"success": True, "deleted_count": deleted_count}
    except Exception as e:
        print(f"Error deleting all goals: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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

# Simulation endpoints
from simulation_tracker import (
    create_simulation_session,
    update_simulation_session,
    get_simulation_session,
    stop_simulation,
    list_simulation_sessions
)

@api_router.post("/simulations/run")
async def run_simulation(
    persona_id: str,
    goal_id: str,
    max_turns: Optional[int] = None,
    reasoning_model: Optional[str] = None,
    reasoning_effort: Optional[str] = None,
    background_tasks: BackgroundTasks = None
):
    """Start a simulation run - creates thread and returns thread_id immediately
    
    Args:
        persona_id: ID of persona to simulate
        goal_id: ID of goal to achieve
        max_turns: Optional max turns override
        reasoning_model: Model for test environment (e.g., gpt-5, o1, gpt-4o)
        reasoning_effort: Effort level for reasoning models (low/medium/high)
        
    Returns:
        {"thread_id": "...", "message": "Simulation started"}
    """
    from testbed_bridge import storage, simulation_engine
    from thread_status import set_thread_status
    from datetime import datetime, timezone
    
    if not simulation_engine:
        raise HTTPException(status_code=503, detail="Simulation engine not initialized. Check LangGraph configuration.")
    
    try:
        # Get persona and goal for validation
        persona = await storage.get_persona(persona_id)
        goal = await storage.get_goal(goal_id)
        
        if not persona or not goal:
            raise HTTPException(status_code=404, detail="Persona or goal not found")
        
        # Determine max turns
        turns_limit = max_turns or goal.max_turns
        reasoning_model = reasoning_model or "gpt-5"
        reasoning_effort = reasoning_effort or "medium"
        
        # Create thread FIRST so we can return thread_id immediately
        thread_info = await simulation_engine.epoch_client.create_thread(
            metadata={
                "owner": "testing-ai",
                "persona_id": persona_id,
                "persona_name": persona.name,
                "goal_id": goal_id,
                "goal_name": goal.name,
                "reasoning_model": reasoning_model,
                "reasoning_effort": reasoning_effort,
                "max_turns": turns_limit,
                "started_at": datetime.now(timezone.utc).isoformat()
            }
        )
        
        thread_id = thread_info["thread_id"]
        
        # Set initial status
        set_thread_status(thread_id, "running", current_turn=0, max_turns=turns_limit)
        
        # Start background task to run simulation loop with existing thread
        background_tasks.add_task(
            run_simulation_background,
            thread_id,
            persona_id,
            goal_id,
            turns_limit,
            reasoning_model,
            reasoning_effort
        )
        
        return {
            "thread_id": thread_id,
            "message": "Simulation started",
            "persona_id": persona_id,
            "goal_id": goal_id,
            "reasoning_model": reasoning_model,
            "reasoning_effort": reasoning_effort
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def run_simulation_background(thread_id: str, persona_id: str, goal_id: str, max_turns: int, reasoning_model: str, reasoning_effort: str):
    """Background task for running simulation loop on existing thread"""
    from thread_status import set_thread_status
    
    try:
        # Run simulation loop with existing thread_id
        result = await simulation_engine.run_simulation_loop(
            thread_id=thread_id,
            persona_id=persona_id,
            goal_id=goal_id,
            reasoning_model=reasoning_model,
            reasoning_effort=reasoning_effort,
            max_turns=max_turns
        )
        
        logger.info(f"Simulation completed successfully - thread_id: {thread_id}")
        
    except Exception as e:
        logger.error(f"Error in simulation background for thread {thread_id}: {e}")
        set_thread_status(thread_id, "failed", stopped_reason=f"error: {str(e)}")
        import traceback
        traceback.print_exc()

@api_router.get("/simulations/{simulation_id}")
async def get_simulation_status(simulation_id: str):
    """Get simulation status by fetching thread directly from LangGraph"""
    from testbed_bridge import simulation_engine
    
    # simulation_id is actually the sim_run_id, we need to get the thread_id
    # For now, check the old session first (backwards compat during migration)
    session = get_simulation_session(simulation_id)
    if session and session.get("thread_id"):
        thread_id = session["thread_id"]
    else:
        # Try to find thread by simulation_run_id in metadata
        try:
            threads = await simulation_engine.epoch_client.client.threads.search(
                metadata={"simulation_run_id": simulation_id},
                limit=1
            )
            if threads and len(threads) > 0:
                thread_id = threads[0]["thread_id"]
            else:
                raise HTTPException(status_code=404, detail="Thread not found for simulation")
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Simulation not found: {str(e)}")
    
    # Get thread messages
    try:
        history = await simulation_engine.epoch_client.get_thread_history(thread_id)
        
        # Extract messages from history
        # History is a list of checkpoint states, each with a 'values' field containing messages
        messages = []
        if isinstance(history, list):
            # Get the last checkpoint which has all messages
            if history:
                last_checkpoint = history[-1]
                if isinstance(last_checkpoint, dict) and "values" in last_checkpoint:
                    messages = last_checkpoint.get("values", {}).get("messages", [])
        elif isinstance(history, dict):
            # Single checkpoint
            messages = history.get("values", {}).get("messages", [])
        
        logger.info(f"Extracted {len(messages)} messages from history")
        
        # Check if simulation should stop (last message has stop=True)
        should_stop = False
        last_message_is_human = False
        if messages:
            last_msg = messages[-1]
            if isinstance(last_msg, dict):
                should_stop = last_msg.get("additional_kwargs", {}).get("stop", False)
                last_message_is_human = last_msg.get("type") == "human"
        
        # Get thread metadata
        thread_info = await simulation_engine.epoch_client.client.threads.get(thread_id)
        metadata = thread_info.get("metadata", {})
        
        # Calculate current turn (count human messages / 2)
        human_count = sum(1 for m in messages if isinstance(m, dict) and m.get("type") == "human")
        current_turn = human_count
        
        return {
            "simulation_id": simulation_id,
            "thread_id": thread_id,
            "persona_id": metadata.get("persona_id"),
            "persona_name": metadata.get("persona_name"),
            "goal_id": metadata.get("goal_id"),
            "goal_name": metadata.get("goal_name"),
            "max_turns": metadata.get("max_turns", 5),
            "status": "completed" if should_stop else "running",
            "current_turn": current_turn,
            "trajectory": messages,
            "started_at": metadata.get("started_at"),
            "should_continue_polling": not should_stop or last_message_is_human
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get simulation status: {str(e)}")

@api_router.post("/simulations/{simulation_id}/stop")
async def stop_simulation_endpoint(simulation_id: str):
    """Stop a running simulation"""
    success = stop_simulation(simulation_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    update_simulation_session(simulation_id, status="stopped")
    
    return {"success": True, "message": "Simulation stop signal sent"}

@api_router.get("/simulations")
async def list_simulations():
    """List all simulation sessions (deprecated - use /threads with metadata filter)"""
    sessions = list_simulation_sessions()
    return sessions

# ==================== THREAD/TRAJECTORY ENDPOINTS ====================

@api_router.get("/threads")
async def list_threads(metadata: Optional[str] = None, limit: int = 100):
    """List threads from LangGraph with optional metadata filter
    
    Example: /api/threads?metadata={"owner":"testing-ai"}&limit=50
    """
    from testbed_bridge import simulation_engine
    
    if not simulation_engine or not simulation_engine.epoch_client:
        raise HTTPException(status_code=503, detail="LangGraph client not initialized")
    
    try:
        # Parse metadata filter if provided
        metadata_filter = {}
        if metadata:
            import json
            metadata_filter = json.loads(metadata)
        
        # Fetch threads from LangGraph
        threads_response = await simulation_engine.epoch_client.client.threads.search(
            metadata=metadata_filter,
            limit=limit
        )
        
        return threads_response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch threads: {str(e)}")

@api_router.get("/threads/{thread_id}/messages")
async def get_thread_messages(thread_id: str):
    """Get messages for a specific thread"""
    from testbed_bridge import simulation_engine
    
    if not simulation_engine or not simulation_engine.epoch_client:
        raise HTTPException(status_code=503, detail="LangGraph client not initialized")
    
    try:
        # Fetch thread history from LangGraph
        history = await simulation_engine.epoch_client.get_thread_history(thread_id)
        
        # Handle different response formats
        if isinstance(history, dict):
            messages = history.get("values", {}).get("messages", [])
        elif isinstance(history, list):
            messages = history
        else:
            messages = []
        
        return {
            "thread_id": thread_id,
            "messages": messages
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch thread messages: {str(e)}")

@api_router.get("/threads/{thread_id}/status")
async def get_thread_status_endpoint(thread_id: str):
    """Get simulation status for a thread
    
    Returns:
        {
            "status": "running" | "completed" | "failed" | "unknown",
            "stopped_reason": "max_turns_reached" | "should_stop_true" | "error: ...",
            "current_turn": 3,
            "max_turns": 5
        }
    """
    from thread_status import get_thread_status
    
    return get_thread_status(thread_id)

# ==================== EVALUATION ENDPOINTS ====================

class EvaluationRequest(BaseModel):
    thread_id: str
    evaluators: List[str] = ["trajectory_accuracy", "goal_completion", "helpfulness"]
    model: str = "openai:gpt-4o-mini"
    dataset_name: Optional[str] = None

class EvaluationResult(BaseModel):
    eval_id: str
    thread_id: str
    status: str  # "running", "completed", "failed"
    evaluators: List[str]
    results: Optional[Dict] = None
    error: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

@api_router.post("/evaluations/run")
async def run_evaluation(request: EvaluationRequest, background_tasks: BackgroundTasks):
    """Run evaluation on a simulation trajectory
    
    This endpoint:
    1. Fetches messages from the thread
    2. Converts to dataset format
    3. Runs selected evaluators
    4. Returns results
    """
    from testbed_bridge import simulation_engine
    
    if not simulation_engine:
        raise HTTPException(status_code=503, detail="Simulation engine not initialized")
    
    try:
        # Generate evaluation ID
        eval_id = str(uuid.uuid4())
        
        # Fetch thread messages
        history = await simulation_engine.epoch_client.get_thread_history(request.thread_id)
        
        # Extract messages from history
        # History is a list of checkpoint states, each with a 'values' field containing messages
        messages = []
        if isinstance(history, list):
            # Get the last checkpoint which has all messages
            if history:
                last_checkpoint = history[-1]
                if isinstance(last_checkpoint, dict) and "values" in last_checkpoint:
                    messages = last_checkpoint.get("values", {}).get("messages", [])
        elif isinstance(history, dict):
            # Single checkpoint
            messages = history.get("values", {}).get("messages", [])
        
        logger.info(f"Extracted {len(messages)} messages from history")
        
        if not messages:
            raise HTTPException(status_code=404, detail="No messages found in thread")
        
        # Get thread metadata
        thread_info = await simulation_engine.epoch_client.client.threads.get(request.thread_id)
        metadata = thread_info.get("metadata", {})
        
        # Calculate total reward from messages
        total_reward = 0
        positive_rewards = 0
        negative_penalties = 0
        
        for msg in messages:
            if isinstance(msg, dict):
                reward = msg.get("additional_kwargs", {}).get("reward", 0)
                if reward > 0:
                    positive_rewards += reward
                elif reward < 0:
                    negative_penalties += abs(reward)
                total_reward += reward
        
        # Convert trajectory to dataset format
        trajectory = []
        for msg in messages:
            if isinstance(msg, dict):
                # Map LangGraph message types to standard roles
                msg_type = msg.get("type", "")
                role_mapping = {
                    "human": "human",
                    "ai": "ai",
                    "tool": "tool",
                    "system": "system",
                    "function": "function"
                }
                role = role_mapping.get(msg_type, msg_type)
                
                # Debug log first few messages to see structure
                if len(trajectory) < 2:
                    logger.info(f"Message {len(trajectory)} keys: {list(msg.keys())}")
                    logger.info(f"Message {len(trajectory)}: type={msg_type}, content={str(msg.get('content', ''))[:100]}")
                
                trajectory.append({
                    "role": role,
                    "content": msg.get("content", ""),
                    "additional_kwargs": msg.get("additional_kwargs", {})
                })
        
        # Prepare evaluation context
        eval_context = {
            "trajectory": trajectory,
            "total_reward": total_reward,
            "positive_rewards": positive_rewards,
            "negative_penalties": negative_penalties,
            "goal": metadata.get("goal_name", "Unknown"),
            "persona": metadata.get("persona_name", "Unknown"),
        }
        
        # Run evaluators
        import sys
        sys.path.insert(0, str(ROOT_DIR / 'testbed'))
        from src.evaluation.evaluator_factory import EvaluatorFactory
        
        factory = EvaluatorFactory(default_model=request.model)
        evaluators = factory.create_evaluators(request.evaluators)
        
        if not evaluators:
            raise HTTPException(status_code=400, detail="No valid evaluators configured")
        
        # Extract the last assistant response as the output
        last_assistant_message = ""
        for msg in reversed(trajectory):
            if msg["role"] == "ai" and msg.get("content"):
                last_assistant_message = msg["content"]
                logger.info(f"Found last AI message: {len(last_assistant_message)} chars")
                break
        
        if not last_assistant_message:
            logger.warning(f"No AI message found in trajectory of {len(trajectory)} messages")
            # Log the roles we found
            roles_found = [msg.get("role") for msg in trajectory[-5:]]
            logger.warning(f"Last 5 message roles: {roles_found}")
        
        # Run evaluators - split into trajectory and simple evaluators
        import inspect
        eval_results = []
        
        for evaluator, eval_name in zip(evaluators, request.evaluators):
            try:
                # Trajectory evaluator needs full trajectory
                if eval_name == "trajectory_accuracy":
                    if inspect.iscoroutinefunction(evaluator):
                        result = await evaluator(
                            outputs=trajectory,
                            inputs=eval_context["goal"],
                            context=eval_context
                        )
                    else:
                        result = evaluator(
                            outputs=trajectory,
                            inputs=eval_context["goal"],
                            context=eval_context
                        )
                else:
                    # Simple evaluators need just the output text
                    if inspect.iscoroutinefunction(evaluator):
                        result = await evaluator(
                            outputs=last_assistant_message,
                            inputs=eval_context["goal"],
                            context=eval_context
                        )
                    else:
                        result = evaluator(
                            outputs=last_assistant_message,
                            inputs=eval_context["goal"],
                            context=eval_context
                        )
                eval_results.append(result)
            except Exception as e:
                logger.error(f"Evaluator {eval_name} failed: {e}", exc_info=True)
                eval_results.append({
                    "key": eval_name,
                    "score": False,
                    "comment": f"Evaluator failed: {str(e)}"
                })
        
        # Store evaluation result
        result = EvaluationResult(
            eval_id=eval_id,
            thread_id=request.thread_id,
            status="completed",
            evaluators=request.evaluators,
            results={
                "total_reward": total_reward,
                "positive_rewards": positive_rewards,
                "negative_penalties": negative_penalties,
                "evaluations": eval_results,
                "metadata": {
                    "goal": eval_context["goal"],
                    "persona": eval_context["persona"],
                    "message_count": len(messages),
                    "model": request.model
                }
            },
            created_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc)
        )
        
        # Store in MongoDB
        doc = result.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        if doc['completed_at']:
            doc['completed_at'] = doc['completed_at'].isoformat()
        
        await db.evaluations.insert_one(doc)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Evaluation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

@api_router.get("/evaluations/{eval_id}")
async def get_evaluation(eval_id: str):
    """Get evaluation results by ID"""
    try:
        result = await db.evaluations.find_one({"eval_id": eval_id})
        
        if not result:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        
        # Remove MongoDB _id
        result.pop('_id', None)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch evaluation: {str(e)}")

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