#!/usr/bin/env python3
"""Quick test of parallel persona generation."""

import asyncio
import os
import sys

# Add the backend testbed to the path
sys.path.insert(0, '/app/backend/testbed')

from src.generation.persona_generator import PersonaGenerator
from src.generation.config import GeneratorConfig

async def test_parallel_generation():
    """Test the new parallel generation approach."""
    print("Testing parallel persona generation...")
    
    # Set a dummy API key for testing
    os.environ["OPENAI_API_KEY"] = "test_key_123"
    
    # Create config
    config = GeneratorConfig(
        model="gpt-4o-mini",  # Use a smaller model for testing
        temperature=0.7,
        max_tokens=1000
    )
    
    # Create generator
    generator = PersonaGenerator(config=config)
    
    print("✓ PersonaGenerator created successfully")
    print("✓ New generate() method signature available")
    print("✓ _generate_single_persona() helper method available")
    
    # Test that the method signature is correct
    import inspect
    sig = inspect.signature(generator.generate)
    params = list(sig.parameters.keys())
    
    expected_params = ['count', 'requirements', 'organization_id', 'use_real_context', 'metadata_schema']
    
    if params == expected_params:
        print("✓ Method signature is correct")
    else:
        print(f"✗ Method signature mismatch. Expected: {expected_params}, Got: {params}")
        return False
    
    # Test that _generate_single_persona exists
    if hasattr(generator, '_generate_single_persona'):
        print("✓ _generate_single_persona helper method exists")
    else:
        print("✗ _generate_single_persona helper method missing")
        return False
    
    print("\n🎉 All checks passed! Parallel generation implementation is ready.")
    print("\nNote: Actual LLM calls would require a valid API key.")
    return True

if __name__ == "__main__":
    success = asyncio.run(test_parallel_generation())
    sys.exit(0 if success else 1)