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

# Export for use in server.py
__all__ = [
    'storage',
    'exa',
    'persona_manager',
    'organization_manager',
    'create_generator_config',
    'default_generator_config',
]
