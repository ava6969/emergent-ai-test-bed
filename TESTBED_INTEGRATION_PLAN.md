# Testbed Integration Plan

## 🎯 Objective
Integrate the advanced testbed backend (PersonaManager, GoalManager, SimulationEngine) with the current table-based UI, replacing simple OpenAI calls with structured LangGraph outputs and proper CRUD operations.

---

## 📊 Current State vs Target State

### Current State (Simple Implementation)
```
Frontend → API Client → FastAPI → OpenAI API (direct) → MongoDB
                                    ↓
                              JSON string parsing
                              Manual validation
                              No enrichment
```

### Target State (Testbed Integration)
```
Frontend → API Client → FastAPI → PersonaManager/GoalManager → PersonaGenerator/GoalGenerator
                                                                         ↓
                                                                   LangChain with_structured_output
                                                                   Pydantic models (type-safe)
                                                                   Exa.ai enrichment (optional)
                                                                   Document context
                                                                         ↓
                                                                   Storage Backend (File/SQLite)
```

---

## 🏗️ Architecture Overview

### Components to Integrate

1. **PersonaManager** (`/app/backend/testbed/src/personas/manager.py`)
   - `generate()` - AI generation with enrichment
   - `create()` - Manual CRUD
   - `get()`, `list()`, `update()`, `delete()`
   - Memory tracking
   - Organization association

2. **GoalManager** (`/app/backend/testbed/src/goals/manager.py`)
   - Similar CRUD operations
   - AI generation with context
   - Evaluation criteria

3. **PersonaGenerator** (`/app/backend/testbed/src/generation/persona_generator.py`)
   - LangChain `with_structured_output`
   - Pydantic models (Agent/PersonaList)
   - Temperature, model, max_tokens configuration
   - Document directory support

4. **GeneratorConfig** (`/app/backend/testbed/src/generation/config.py`)
   - Model selection (GPT-4o, Claude, etc.)
   - Temperature, max_tokens
   - Reasoning effort (for O1 models)
   - Custom prompts
   - Document directory

5. **Storage Backend** (`/app/backend/testbed/src/storage/`)
   - FileStorage (JSON files)
   - SQLiteStorage (SQLite DB)
   - Unified interface
   - Better than direct MongoDB for this use case

6. **ExaIntegration** (`/app/backend/testbed/src/integrations/exa.py`)
   - Real-world company context
   - Scenario enrichment
   - Optional enrichment toggle

---

## 📋 Implementation Plan - Phase 1: Personas

### Phase 1.1: Backend Integration - Persona Generation

**Goal:** Replace simple OpenAI call with PersonaGenerator + LangChain structured output

**Files to Modify:**
- `/app/backend/server.py`
- Create: `/app/backend/testbed_integration.py` (bridge layer)

**Steps:**

1. **Initialize Testbed Components**
   ```python
   # In server.py
   from backend.testbed.src.storage.file import FileStorage
   from backend.testbed.src.personas.manager import PersonaManager
   from backend.testbed.src.generation.config import GeneratorConfig
   from backend.testbed.src.integrations.exa import ExaIntegration
   
   # Initialize storage
   storage = FileStorage(data_dir="./testbed_data")
   
   # Initialize Exa (optional)
   exa = None
   if os.getenv("EXA_API_KEY"):
       exa = ExaIntegration(api_key=os.getenv("EXA_API_KEY"))
   
   # Initialize PersonaManager
   generator_config = GeneratorConfig(
       model="gpt-4o-mini",
       temperature=0.7,
       max_tokens=500
   )
   persona_manager = PersonaManager(
       storage=storage,
       exa_integration=exa,
       generator_config=generator_config
   )
   ```

2. **Update Generation Endpoint**
   ```python
   @api_router.post("/ai/generate/persona")
   async def generate_persona_endpoint(request: GeneratePersonaRequest):
       """Generate persona using testbed PersonaManager"""
       try:
           # Use PersonaManager.generate()
           personas = await persona_manager.generate(
               count=1,
               requirements=request.description,
               organization_id=request.organization_id,
               use_real_context=request.use_exa_enrichment,
               metadata_schema=request.metadata_schema
           )
           
           # Return first persona (we only generate 1)
           if personas:
               persona = personas[0]
               return {
                   "message": f"✓ Created persona: {persona.name}",
                   "generated_items": {
                       "persona": persona.model_dump()
                   }
               }
           else:
               raise HTTPException(status_code=500, detail="No persona generated")
               
       except Exception as e:
           print(f"Error generating persona: {e}")
           traceback.print_exc()
           raise HTTPException(status_code=500, detail=str(e))
   ```

3. **Update Request Models**
   ```python
   class GeneratePersonaRequest(BaseModel):
       description: str
       organization_id: Optional[str] = None
       use_exa_enrichment: bool = False
       metadata_schema: Optional[Dict[str, Any]] = None
       
       # Generation settings
       model: str = "gpt-4o-mini"
       temperature: float = 0.7
       max_tokens: int = 500
   ```

**Benefits:**
- ✅ Type-safe Pydantic models (Agent)
- ✅ LangChain structured output (guaranteed valid JSON)
- ✅ Exa.ai enrichment support
- ✅ Organization context
- ✅ Configurable generation parameters

---

### Phase 1.2: Backend Integration - Persona CRUD

**Goal:** Use PersonaManager for all CRUD operations instead of direct MongoDB

**Files to Modify:**
- `/app/backend/server.py`

**Replace Direct MongoDB with PersonaManager:**

```python
# OLD (Direct MongoDB)
@api_router.get("/personas")
async def list_personas():
    personas = []
    cursor = db.personas.find()
    async for doc in cursor:
        personas.append(doc)
    return personas

# NEW (PersonaManager)
@api_router.get("/personas")
async def list_personas(organization_id: Optional[str] = None):
    """List all personas"""
    personas = await persona_manager.list(organization_id=organization_id)
    return [p.model_dump() for p in personas]

# OLD (Direct MongoDB)
@api_router.post("/personas")
async def create_persona(data: PersonaCreate):
    persona = {...}
    await db.personas.insert_one(persona)
    return persona

# NEW (PersonaManager)
@api_router.post("/personas")
async def create_persona(data: PersonaCreate):
    """Create persona manually"""
    persona = await persona_manager.create(
        name=data.name,
        background=data.background,
        organization_id=data.organization_id,
        metadata={"tags": data.tags} if data.tags else {}
    )
    return persona.model_dump()

# OLD (Direct MongoDB)
@api_router.put("/personas/{persona_id}")
async def update_persona(persona_id: str, data: PersonaUpdate):
    await db.personas.update_one(...)
    
# NEW (PersonaManager)
@api_router.put("/personas/{persona_id}")
async def update_persona(persona_id: str, data: PersonaUpdate):
    """Update persona"""
    persona = await persona_manager.update(
        persona_id,
        name=data.name,
        background=data.background,
        organization_id=data.organization_id,
        metadata={"tags": data.tags} if data.tags else None
    )
    return persona.model_dump()

# OLD (Direct MongoDB)
@api_router.delete("/personas/{persona_id}")
async def delete_persona(persona_id: str):
    await db.personas.delete_one(...)
    
# NEW (PersonaManager)
@api_router.delete("/personas/{persona_id}")
async def delete_persona(persona_id: str, delete_trajectories: bool = False):
    """Delete persona"""
    await persona_manager.delete(persona_id, delete_trajectories=delete_trajectories)
    return {"success": True}
```

**Benefits:**
- ✅ Unified storage abstraction
- ✅ Type-safe operations
- ✅ Memory tracking built-in
- ✅ Organization association
- ✅ Can switch storage backend easily

---

### Phase 1.3: Frontend Integration - Settings Modal

**Goal:** Connect settings modal to send GeneratorConfig parameters

**Files to Modify:**
- `/app/frontend/src/components/shared/GenerationSettings.jsx`
- `/app/frontend/src/pages/Personas.jsx`
- `/app/frontend/src/lib/api/client.js`

**Update API Client:**
```javascript
// In client.js
async generatePersona(request) {
  const response = await this.client.post('/api/ai/generate/persona', {
    description: request.description,
    organization_id: request.organization_id || null,
    use_exa_enrichment: request.use_exa_enrichment || false,
    metadata_schema: request.metadata_schema || null,
    
    // Generation settings
    model: request.model || 'gpt-4o-mini',
    temperature: request.temperature || 0.7,
    max_tokens: request.max_tokens || 500,
  });
  return response.data;
}
```

**Update Personas Page to Use Settings:**
```javascript
// In Personas.jsx
const generateMutation = useMutation({
  mutationFn: async (description) => {
    // Load settings from localStorage
    const settings = JSON.parse(
      localStorage.getItem('generation_settings_persona') || '{}'
    );
    
    return await apiClient.generatePersona({
      description,
      organization_id: settings.organization_id,
      use_exa_enrichment: settings.use_exa_enrichment,
      model: settings.model,
      temperature: settings.temperature,
      max_tokens: settings.max_tokens,
    });
  },
  // ...
});
```

**Benefits:**
- ✅ User can control generation parameters
- ✅ Settings persist across sessions
- ✅ Model selection works
- ✅ Exa enrichment toggle functional

---

## 📋 Implementation Plan - Phase 2: Goals

### Phase 2.1: Backend Integration - Goal Generation

**Goal:** Implement structured goal generation with GoalManager

**Files to Create/Modify:**
- `/app/backend/testbed/src/goals/generator.py` (create new)
- `/app/backend/testbed/src/goals/manager.py` (update)
- `/app/backend/server.py`

**Create GoalGenerator (Similar to PersonaGenerator):**
```python
# /app/backend/testbed/src/goals/generator.py

from langchain.chat_models import init_chat_model
from pydantic import BaseModel, Field
from typing import List

class GoalData(BaseModel):
    """Single goal structure"""
    name: str = Field(description="Concise goal name")
    objective: str = Field(description="What should be achieved")
    success_criteria: str = Field(description="How to measure success")
    initial_prompt: str = Field(description="Starting message")
    max_turns: int = Field(default=10, description="Maximum conversation turns")

class GoalList(BaseModel):
    """Container for generated goals"""
    goals: List[GoalData] = Field(description="List of generated goals")

class GoalGenerator:
    """Generate test goals using LLM with structured outputs"""
    
    def __init__(self, config: GeneratorConfig):
        self.config = config
        self.model = init_chat_model(
            model=config.get_model_name(),
            model_provider=config.get_provider(),
            temperature=config.temperature,
            max_tokens=config.max_tokens,
        )
        
        self.structured_model = self.model.with_structured_output(
            GoalList, 
            method="function_calling"
        )
    
    async def generate_goals(
        self,
        count: int,
        requirements: str,
        persona_context: Optional[str] = None,
        organization_context: Optional[str] = None
    ) -> List[GoalData]:
        """Generate goals based on requirements"""
        
        # Build prompt
        prompt = f"""Generate {count} test goal(s) for AI agent evaluation:

Requirements: {requirements}
"""
        
        if persona_context:
            prompt += f"\nPersona Context: {persona_context}"
        
        if organization_context:
            prompt += f"\nOrganization Context: {organization_context}"
        
        prompt += """

Create realistic goals that:
1. Have clear objectives
2. Measurable success criteria
3. Appropriate initial prompts
4. Reasonable max turns (5-20)

Return as structured JSON."""

        from langchain_core.messages import HumanMessage, SystemMessage
        
        messages = [
            SystemMessage(content="You are an expert at creating test scenarios for AI agents."),
            HumanMessage(content=prompt),
        ]
        
        response = await self.structured_model.ainvoke(messages)
        
        if response is None:
            raise ValueError("LLM returned None")
        
        return response.goals
```

**Integrate into GoalManager:**
```python
# Update /app/backend/testbed/src/goals/manager.py

class GoalManager:
    def __init__(
        self,
        storage: StorageBackend,
        exa_integration: Optional[ExaIntegration] = None,
        generator_config: Optional[GeneratorConfig] = None
    ):
        self.storage = storage
        self.exa = exa_integration
        
        if generator_config is None:
            generator_config = GeneratorConfig()
        
        self.generator = GoalGenerator(config=generator_config)
    
    async def generate(
        self,
        count: int,
        requirements: str,
        persona_id: Optional[str] = None,
        organization_id: Optional[str] = None,
        use_real_context: bool = False
    ) -> List[Goal]:
        """Generate goals with enrichment"""
        
        # Get persona context if provided
        persona_context = ""
        if persona_id:
            persona = await self.storage.get_persona(persona_id)
            if persona:
                persona_context = f"Testing persona: {persona.name} - {persona.background}"
        
        # Get organization context
        org_context = ""
        if organization_id:
            org = await self.storage.get_organization(organization_id)
            if org:
                org_context = f"Organization: {org.name} - {org.description}"
        
        # Use Exa for enrichment
        if use_real_context and self.exa:
            # Similar to PersonaManager
            pass
        
        # Generate goals
        goal_data_list = await self.generator.generate_goals(
            count=count,
            requirements=requirements,
            persona_context=persona_context,
            organization_context=org_context
        )
        
        # Convert to Goal models and save
        goals = []
        for goal_data in goal_data_list:
            goal = Goal(
                id=self._generate_id(goal_data.name),
                name=goal_data.name,
                objective=goal_data.objective,
                success_criteria=goal_data.success_criteria,
                initial_prompt=goal_data.initial_prompt,
                max_turns=goal_data.max_turns,
                organization_id=organization_id,
                evaluators=["goal_achievement", "turn_efficiency"]
            )
            await self.storage.save_goal(goal)
            goals.append(goal)
        
        return goals
```

**Update Backend API:**
```python
# In /app/backend/server.py

# Initialize GoalManager
from backend.testbed.src.goals.manager import GoalManager

goal_manager = GoalManager(
    storage=storage,
    exa_integration=exa,
    generator_config=generator_config
)

@api_router.post("/ai/generate/goal")
async def generate_goal_endpoint(request: GenerateGoalRequest):
    """Generate goal using GoalManager"""
    try:
        goals = await goal_manager.generate(
            count=1,
            requirements=request.description,
            persona_id=request.persona_id,
            organization_id=request.organization_id,
            use_real_context=request.use_exa_enrichment
        )
        
        if goals:
            goal = goals[0]
            return {
                "message": f"✓ Created goal: {goal.name}",
                "generated_items": {
                    "goal": goal.model_dump()
                }
            }
        else:
            raise HTTPException(status_code=500, detail="No goal generated")
            
    except Exception as e:
        print(f"Error generating goal: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
```

---

### Phase 2.2: Goal CRUD with GoalManager

Similar to Persona CRUD, replace all direct DB operations with GoalManager:
- `list()` 
- `create()`
- `get()`
- `update()`
- `delete()`

---

## 📋 Implementation Plan - Phase 3: Organizations

### Phase 3.1: Organization Generation with Exa

**Goal:** Auto-generate organization context from real companies using Exa

**Flow:**
```
User enters: "Stripe"
↓
Backend calls: ExaIntegration.search_company_context("Stripe")
↓
Exa returns: Company culture, team structure, typical roles
↓
Save to Organization with exa_search_results
```

**Implementation:**
```python
@api_router.post("/organizations/generate")
async def generate_organization(request: GenerateOrgRequest):
    """Generate organization from real company using Exa"""
    
    if not exa:
        raise HTTPException(status_code=400, detail="Exa.ai not configured")
    
    try:
        # Search for company context
        exa_results = exa.search_company_context(
            company_name=request.company_name,
            num_results=5
        )
        
        # Create organization
        org = await organization_manager.create_from_exa(
            name=request.company_name,
            exa_results=exa_results
        )
        
        return org.model_dump()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## 📋 Implementation Plan - Phase 4: Simulations

### Phase 4.1: Connect to SimulationEngine

**Goal:** Enable "Run Test" button to actually run simulations

**Current:** Button shows "Coming Soon"
**Target:** Launches simulation with SimulationEngine

**Implementation:**
```python
# Initialize SimulationEngine
from backend.testbed.src.simulations.engine import SimulationEngine

simulation_engine = SimulationEngine(storage=storage)

@api_router.post("/simulations/run")
async def run_simulation(request: RunSimulationRequest):
    """Run simulation with persona and goal"""
    
    try:
        result = await simulation_engine.run_simulation(
            persona_id=request.persona_id,
            goal_id=request.goal_id,
            max_turns=request.max_turns,
            use_memory=request.use_memory,
            model=request.model,
            evaluators=request.evaluators
        )
        
        return {
            "simulation_id": result.simulation_run_id,
            "trajectory_id": result.trajectory_id,
            "goal_achieved": result.goal_achieved,
            "overall_score": result.overall_score,
            "turns": result.turns
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

**Frontend:**
```javascript
// In Goals.jsx
const handleRunTest = (goal) => {
  // Show persona selection modal
  setShowSimulationDialog(true);
  setSelectedGoal(goal);
};

// In SimulationDialog.jsx
const handleRunSimulation = async () => {
  const result = await apiClient.runSimulation({
    persona_id: selectedPersona.id,
    goal_id: selectedGoal.id,
    max_turns: 10,
    use_memory: true,
    model: 'gpt-4o',
    evaluators: ['goal_achievement', 'turn_efficiency']
  });
  
  // Navigate to results page or show summary
  navigate(`/simulations/${result.simulation_id}`);
};
```

---

## 🔧 Technical Details

### Storage Backend Decision

**Option 1: FileStorage** (Recommended for MVP)
```python
from backend.testbed.src.storage.file import FileStorage
storage = FileStorage(data_dir="./testbed_data")
```
**Pros:**
- Simple, no DB needed
- Easy to inspect (JSON files)
- Good for development
- Git-friendly

**Cons:**
- Not suitable for production scale
- No concurrent write protection

**Option 2: SQLiteStorage**
```python
from backend.testbed.src.storage.sqlite import SQLiteStorage
storage = SQLiteStorage(db_path="./testbed.db")
```
**Pros:**
- Better performance
- ACID transactions
- Single file
- Production-ready for small/medium scale

**Cons:**
- Requires SQLite setup

**Recommendation:** Start with FileStorage for Phase 1-2, migrate to SQLiteStorage in Phase 3-4.

---

### LangChain Structured Output Benefits

**Current (String Parsing):**
```python
# Fragile - breaks if LLM doesn't return valid JSON
content = response.choices[0].message.content
json_match = re.search(r'\{.*\}', content, re.DOTALL)
persona_data = json.loads(json_match.group())  # ← Can fail
```

**New (Structured Output):**
```python
# Type-safe - guaranteed to match Pydantic model
self.structured_model = self.model.with_structured_output(
    PersonaList,  # ← Pydantic model
    method="function_calling"
)
response = await self.structured_model.ainvoke(messages)
# response.agents is List[Agent] - guaranteed type safety
```

**Benefits:**
- ✅ No JSON parsing errors
- ✅ Type safety (Pydantic validation)
- ✅ LLM forced to return valid structure
- ✅ Better error messages
- ✅ IDE autocomplete

---

## 📝 API Contract Changes

### Persona Generation

**OLD:**
```json
POST /api/ai/generate/persona
{
  "message": "description",
  "conversation_id": "id",
  "context": {}
}
```

**NEW:**
```json
POST /api/ai/generate/persona
{
  "description": "Senior software engineer",
  "organization_id": "tech_corp",
  "use_exa_enrichment": true,
  "metadata_schema": {
    "experience_level": "senior|mid|junior",
    "specialization": "backend|frontend|fullstack"
  },
  "model": "gpt-4o-mini",
  "temperature": 0.7,
  "max_tokens": 500
}
```

**Response (Enhanced):**
```json
{
  "message": "✓ Created persona: David Thompson",
  "generated_items": {
    "persona": {
      "id": "david_thompson",
      "name": "David Thompson",
      "background": "...",
      "organization_id": "tech_corp",
      "metadata": {
        "experience_level": "senior",
        "specialization": "backend"
      },
      "trajectory_ids": [],
      "created_from_real_data": false,
      "created_at": "..."
    }
  }
}
```

---

## 🎯 Priority Order

### Phase 1: Personas (START HERE)
**Time:** 2-3 hours
1. ✅ Initialize storage + PersonaManager
2. ✅ Replace generation endpoint with PersonaGenerator
3. ✅ Replace CRUD with PersonaManager methods
4. ✅ Test: Generate persona, see structured output
5. ✅ Test: CRUD operations work

### Phase 2: Goals
**Time:** 1-2 hours
1. ✅ Create GoalGenerator with structured output
2. ✅ Update GoalManager with generate()
3. ✅ Replace CRUD with GoalManager
4. ✅ Test: Generate goal with persona context

### Phase 3: Settings Integration
**Time:** 1 hour
1. ✅ Connect settings modal to API
2. ✅ Load settings in generation mutation
3. ✅ Test: Model selection, temperature, Exa toggle

### Phase 4: Organizations
**Time:** 1 hour
1. ✅ Add Exa-based generation
2. ✅ Test: Generate from real company

### Phase 5: Simulations
**Time:** 2-3 hours
1. ✅ Connect Run Test button
2. ✅ Create simulation dialog
3. ✅ Run simulation with engine
4. ✅ Display results

---

## ✅ Success Criteria

### Phase 1 Complete When:
- [ ] Persona generation uses `PersonaGenerator` with `with_structured_output`
- [ ] Response is always valid Pydantic `Agent` model
- [ ] All CRUD operations use `PersonaManager`
- [ ] Settings modal controls generation parameters
- [ ] Exa enrichment toggle works

### Phase 2 Complete When:
- [ ] Goal generation uses `GoalGenerator` with structured output
- [ ] Goals reference personas for context
- [ ] CRUD uses `GoalManager`

### Phase 3 Complete When:
- [ ] Settings modal fully functional
- [ ] Model selection works (GPT-4o, Claude, etc.)
- [ ] Temperature and max_tokens applied
- [ ] Exa toggle adds real-world context

### Phase 4 Complete When:
- [ ] Organizations can be generated from real companies
- [ ] Exa search populates organization data

### Phase 5 Complete When:
- [ ] Run Test button launches simulation
- [ ] Simulation engine executes test
- [ ] Results are displayed with scores

---

## 🚀 Let's Start: Phase 1 Implementation

Ready to begin with Phase 1 (Personas)?

I'll:
1. Initialize FileStorage + PersonaManager
2. Replace OpenAI direct call with PersonaGenerator
3. Update CRUD endpoints to use PersonaManager
4. Test structured output generation
5. Verify type safety

Shall I proceed with Phase 1 implementation?
