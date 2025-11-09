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
    print("TESTING SIMULATION FUNCTIONALITY WITH LANGGRAPH")
    print("=" * 60)
    
    # Use specific test data as requested
    persona_id = "TRD-027"  # Elena Marquez
    goal_id = "momentum_analysis_001"  # Sector Momentum Analysis
    
    print(f"\n1. Testing with specified test data:")
    print(f"   Persona ID: {persona_id} (Elena Marquez)")
    print(f"   Goal ID: {goal_id} (Sector Momentum Analysis)")
    
    # Verify personas and goals exist
    try:
        # Check if personas exist
        personas_response = requests.get(f"{BACKEND_URL}/personas")
        personas_response.raise_for_status()
        personas = personas_response.json()
        
        persona_found = any(p.get("id") == persona_id for p in personas)
        if persona_found:
            print(f"✅ Persona {persona_id} found in database")
        else:
            print(f"⚠️  Persona {persona_id} not found, will test anyway (may be created by testbed)")
        
        # Check if goals exist
        goals_response = requests.get(f"{BACKEND_URL}/goals")
        goals_response.raise_for_status()
        goals = goals_response.json()
        
        goal_found = any(g.get("id") == goal_id for g in goals)
        if goal_found:
            print(f"✅ Goal {goal_id} found in database")
        else:
            print(f"⚠️  Goal {goal_id} not found, will test anyway (may be created by testbed)")
        
    except Exception as e:
        print(f"⚠️  Error checking personas/goals: {e}")
        print("   Continuing with test anyway...")
    
    # Test results tracking
    test_results = []
    simulation_id = None
    
    print("\n2. Testing POST /api/simulations/run (Start Real Simulation)...")
    print("-" * 50)
    
    # Test 1: POST /api/simulations/run - Should start a real simulation now
    try:
        run_payload = {
            "persona_id": persona_id,
            "goal_id": goal_id
        }
        
        print(f"Starting simulation with:")
        print(f"  - Persona: {persona_id} (Elena Marquez)")
        print(f"  - Goal: {goal_id} (Sector Momentum Analysis)")
        
        run_response = requests.post(
            f"{BACKEND_URL}/simulations/run",
            params=run_payload,
            timeout=15
        )
        
        print(f"Response status: {run_response.status_code}")
        print(f"Response body: {run_response.text}")
        
        if run_response.status_code == 200:
            response_data = run_response.json()
            simulation_id = response_data.get("simulation_id")
            status = response_data.get("status")
            
            if simulation_id and status == "running":
                print(f"✅ PASS: Simulation started successfully!")
                print(f"   Simulation ID: {simulation_id}")
                print(f"   Status: {status}")
                test_results.append(("POST /api/simulations/run", "PASS", f"Started simulation {simulation_id}"))
            else:
                print(f"❌ FAIL: Expected simulation_id and status='running', got: {response_data}")
                test_results.append(("POST /api/simulations/run", "FAIL", f"Invalid response: {response_data}"))
        elif run_response.status_code == 500:
            response_data = run_response.json()
            error_detail = response_data.get("detail", "")
            if "Simulation engine not initialized" in error_detail:
                print("❌ FAIL: LangGraph credentials still not working")
                print(f"   Error: {error_detail}")
                test_results.append(("POST /api/simulations/run", "FAIL", "LangGraph credentials not configured properly"))
            else:
                print(f"❌ FAIL: Unexpected 500 error: {error_detail}")
                test_results.append(("POST /api/simulations/run", "FAIL", f"Server error: {error_detail}"))
        else:
            print(f"❌ FAIL: Unexpected status code {run_response.status_code}")
            test_results.append(("POST /api/simulations/run", "FAIL", f"Status {run_response.status_code}"))
            
    except Exception as e:
        print(f"❌ FAIL: Exception during simulation start: {e}")
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