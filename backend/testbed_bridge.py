"""
Bridge module to initialize and expose testbed components to the main server.

This module initializes:
- Storage backend (FileStorage)
- PersonaManager with PersonaGenerator
- GoalManager with GoalGenerator
- OrganizationManager
- ExaIntegration
- GeneratorConfig
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Add testbed to Python path
TESTBED_DIR = Path(__file__).parent / "testbed"
sys.path.insert(0, str(TESTBED_DIR))

from src.storage.file import FileStorage
from src.personas.manager import PersonaManager
from src.organizations.manager import OrganizationManager
from src.integrations.exa import ExaIntegration
from src.generation.config import GeneratorConfig

# Storage backend
DATA_DIR = Path(__file__).parent / "testbed_data"
DATA_DIR.mkdir(exist_ok=True)

storage = FileStorage(base_path=str(DATA_DIR))
print(f"✓ Initialized FileStorage at: {DATA_DIR}")

# Exa integration (optional)
exa = None
exa_api_key = os.getenv("EXA_API_KEY")
if exa_api_key and exa_api_key != "your_exa_api_key":
    try:
        exa = ExaIntegration(api_key=exa_api_key)
        print("✓ Initialized Exa.ai integration")
    except Exception as e:
        print(f"⚠ Exa.ai initialization failed: {e}")
else:
    print("⚠ Exa.ai not configured (EXA_API_KEY not set)")

# Generator configuration
def create_generator_config(
    model: str = "gpt-4o-mini",
    temperature: float = 0.7,
    max_tokens: int = 1500,
    api_key: str = None
) -> GeneratorConfig:
    """Create a GeneratorConfig with specified parameters"""
    return GeneratorConfig(
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        api_key=api_key or os.getenv("OPENAI_API_KEY")
    )

# Default generator config
default_generator_config = create_generator_config()

# Initialize managers
persona_manager = PersonaManager(
    storage=storage,
    exa_integration=exa,
    generator_config=default_generator_config
)
print("✓ Initialized PersonaManager")

organization_manager = OrganizationManager(
    storage=storage,
    exa_integration=exa
)
print("✓ Initialized OrganizationManager")

# Initialize GoalManager
from src.goals.manager import GoalManager

goal_manager = GoalManager(
    storage=storage,
    exa_integration=exa,
    generator_config=default_generator_config,
    use_agent_generator=True
)
print("✓ Initialized GoalManager")

# Initialize SimulationEngine (optional - requires LangGraph Cloud credentials)
simulation_engine = None
try:
    from src.simulations import SimulationEngine
    from src.orchestrator.epoch_client import EpochClient

    # Check if LangGraph credentials are available
    langgraph_url = os.getenv("LANGGRAPH_API_URL")
    langgraph_key = os.getenv("LANGGRAPH_API_KEY")
    assistant_id = os.getenv("EPOCH_ASSISTANT_ID") or os.getenv("EPOCH_AGENT_ID")
    
    print(f"Debug: LANGGRAPH_API_URL = {langgraph_url}")
    print(f"Debug: LANGGRAPH_API_KEY = {'***' if langgraph_key else None}")
    print(f"Debug: EPOCH_ASSISTANT_ID = {assistant_id}")
    
    if langgraph_url and langgraph_key and assistant_id:
        # Initialize EpochClient (LLM orchestrator)
        epoch_client = EpochClient()
        
        simulation_engine = SimulationEngine(
            storage=storage,
            epoch_client=epoch_client,
            simulation_model="gpt-5",
            evaluation_model="gpt-5-mini"
        )
        print("✓ Initialized SimulationEngine with LangGraph Cloud")
    else:
        print("⚠ SimulationEngine not initialized (LangGraph Cloud credentials not configured)")
        print(f"  Missing: URL={not langgraph_url}, KEY={not langgraph_key}, ASSISTANT_ID={not assistant_id}")
except Exception as e:
    print(f"⚠ Failed to initialize SimulationEngine: {e}")
    import traceback
    traceback.print_exc()

# Export for use in server.py
__all__ = [
    'storage',
    'exa',
    'persona_manager',
    'goal_manager',
    'simulation_engine',
    'organization_manager',
    'create_generator_config',
    'default_generator_config',
]
