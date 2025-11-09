#!/usr/bin/env python3
"""
Backend API Testing for Simulation Endpoints
Tests the simulation API endpoints with LangGraph credentials configured.
"""

import requests
import json
import sys
import uuid
import time
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://agentlab-3.preview.emergentagent.com/api"

def test_simulation_functionality():
    """Test actual simulation functionality with LangGraph credentials configured"""
    
    print("=" * 60)
    print("TESTING SIMULATION API ENDPOINTS")
    print("=" * 60)
    
    # First, get existing personas and goals
    print("\n1. Getting existing personas and goals...")
    
    try:
        # Get personas
        personas_response = requests.get(f"{BACKEND_URL}/personas")
        personas_response.raise_for_status()
        personas = personas_response.json()
        
        if not personas:
            print("❌ No personas found in database")
            return False
            
        persona = personas[0]
        persona_id = persona["id"]
        persona_name = persona["name"]
        print(f"✅ Found persona: {persona_name} (ID: {persona_id})")
        
        # Get goals
        goals_response = requests.get(f"{BACKEND_URL}/goals")
        goals_response.raise_for_status()
        goals = goals_response.json()
        
        if not goals:
            print("❌ No goals found in database")
            return False
            
        goal = goals[0]
        goal_id = goal["id"]
        goal_name = goal["name"]
        print(f"✅ Found goal: {goal_name} (ID: {goal_id})")
        
    except Exception as e:
        print(f"❌ Error getting personas/goals: {e}")
        return False
    
    # Test results tracking
    test_results = []
    
    print("\n2. Testing POST /api/simulations/run...")
    print("-" * 40)
    
    # Test 1: POST /api/simulations/run - Should return error when SimulationEngine not configured
    try:
        run_payload = {
            "persona_id": persona_id,
            "goal_id": goal_id
        }
        
        print(f"Sending request with persona_id: {persona_id}, goal_id: {goal_id}")
        
        run_response = requests.post(
            f"{BACKEND_URL}/simulations/run",
            params=run_payload,
            timeout=10
        )
        
        print(f"Response status: {run_response.status_code}")
        print(f"Response body: {run_response.text}")
        
        if run_response.status_code == 500:
            response_data = run_response.json()
            if "Simulation engine not initialized" in response_data.get("detail", ""):
                print("✅ PASS: Correctly returned 500 with 'Simulation engine not initialized'")
                test_results.append(("POST /api/simulations/run", "PASS", "Correctly handles missing LangGraph credentials"))
            else:
                print(f"❌ FAIL: Expected 'Simulation engine not initialized', got: {response_data.get('detail')}")
                test_results.append(("POST /api/simulations/run", "FAIL", f"Wrong error message: {response_data.get('detail')}"))
        else:
            print(f"❌ FAIL: Expected 500 status, got {run_response.status_code}")
            test_results.append(("POST /api/simulations/run", "FAIL", f"Expected 500, got {run_response.status_code}"))
            
    except Exception as e:
        print(f"❌ FAIL: Exception during simulation run test: {e}")
        test_results.append(("POST /api/simulations/run", "FAIL", f"Exception: {e}"))
    
    print("\n3. Testing GET /api/simulations/{simulation_id}...")
    print("-" * 40)
    
    # Test 2: GET /api/simulations/{simulation_id} - Should return 404 for non-existent ID
    try:
        fake_simulation_id = str(uuid.uuid4())
        print(f"Testing with non-existent simulation_id: {fake_simulation_id}")
        
        get_response = requests.get(f"{BACKEND_URL}/simulations/{fake_simulation_id}")
        
        print(f"Response status: {get_response.status_code}")
        print(f"Response body: {get_response.text}")
        
        if get_response.status_code == 404:
            response_data = get_response.json()
            if "Simulation not found" in response_data.get("detail", ""):
                print("✅ PASS: Correctly returned 404 with 'Simulation not found'")
                test_results.append(("GET /api/simulations/{id}", "PASS", "Correctly handles non-existent simulation"))
            else:
                print(f"❌ FAIL: Expected 'Simulation not found', got: {response_data.get('detail')}")
                test_results.append(("GET /api/simulations/{id}", "FAIL", f"Wrong error message: {response_data.get('detail')}"))
        else:
            print(f"❌ FAIL: Expected 404 status, got {get_response.status_code}")
            test_results.append(("GET /api/simulations/{id}", "FAIL", f"Expected 404, got {get_response.status_code}"))
            
    except Exception as e:
        print(f"❌ FAIL: Exception during simulation get test: {e}")
        test_results.append(("GET /api/simulations/{id}", "FAIL", f"Exception: {e}"))
    
    print("\n4. Testing POST /api/simulations/{simulation_id}/stop...")
    print("-" * 40)
    
    # Test 3: POST /api/simulations/{simulation_id}/stop - Should return 404 for non-existent ID
    try:
        fake_simulation_id = str(uuid.uuid4())
        print(f"Testing stop with non-existent simulation_id: {fake_simulation_id}")
        
        stop_response = requests.post(f"{BACKEND_URL}/simulations/{fake_simulation_id}/stop")
        
        print(f"Response status: {stop_response.status_code}")
        print(f"Response body: {stop_response.text}")
        
        if stop_response.status_code == 404:
            response_data = stop_response.json()
            if "Simulation not found" in response_data.get("detail", ""):
                print("✅ PASS: Correctly returned 404 with 'Simulation not found'")
                test_results.append(("POST /api/simulations/{id}/stop", "PASS", "Correctly handles non-existent simulation"))
            else:
                print(f"❌ FAIL: Expected 'Simulation not found', got: {response_data.get('detail')}")
                test_results.append(("POST /api/simulations/{id}/stop", "FAIL", f"Wrong error message: {response_data.get('detail')}"))
        else:
            print(f"❌ FAIL: Expected 404 status, got {stop_response.status_code}")
            test_results.append(("POST /api/simulations/{id}/stop", "FAIL", f"Expected 404, got {stop_response.status_code}"))
            
    except Exception as e:
        print(f"❌ FAIL: Exception during simulation stop test: {e}")
        test_results.append(("POST /api/simulations/{id}/stop", "FAIL", f"Exception: {e}"))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for endpoint, status, details in test_results:
        status_icon = "✅" if status == "PASS" else "❌"
        print(f"{status_icon} {endpoint}: {status}")
        print(f"   {details}")
        
        if status == "PASS":
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal: {passed} passed, {failed} failed")
    
    # Test additional endpoint - GET /api/simulations (list all)
    print("\n5. Testing GET /api/simulations (list all)...")
    print("-" * 40)
    
    try:
        list_response = requests.get(f"{BACKEND_URL}/simulations")
        print(f"Response status: {list_response.status_code}")
        print(f"Response body: {list_response.text}")
        
        if list_response.status_code == 200:
            simulations = list_response.json()
            print(f"✅ PASS: Successfully retrieved {len(simulations)} simulations")
            test_results.append(("GET /api/simulations", "PASS", f"Retrieved {len(simulations)} simulations"))
        else:
            print(f"❌ FAIL: Expected 200, got {list_response.status_code}")
            test_results.append(("GET /api/simulations", "FAIL", f"Expected 200, got {list_response.status_code}"))
            
    except Exception as e:
        print(f"❌ FAIL: Exception during list simulations test: {e}")
        test_results.append(("GET /api/simulations", "FAIL", f"Exception: {e}"))
    
    return failed == 0

if __name__ == "__main__":
    print(f"Testing backend at: {BACKEND_URL}")
    print(f"Test started at: {datetime.now()}")
    
    success = test_simulation_endpoints()
    
    if success:
        print("\n🎉 All simulation endpoint tests passed!")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed!")
        sys.exit(1)