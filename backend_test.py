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
BACKEND_URL = "https://evaluscape.preview.emergentagent.com/api"

def test_simulation_functionality():
    """Test updated simulation functionality with new model factory and reasoning effort parameter"""
    
    print("=" * 60)
    print("TESTING UPDATED SIMULATION FUNCTIONALITY")
    print("Testing: Model Factory Integration & Reasoning Effort Parameter")
    print("=" * 60)
    
    # Use specific test data as requested in review
    persona_id = "TRD-027"  # Elena Marquez
    goal_id = "momentum_analysis_001"  # Sector Momentum Analysis
    reasoning_model = "gpt-5"  # Default reasoning model
    reasoning_effort = "medium"  # Default reasoning effort
    max_turns = 2  # For faster testing
    
    print(f"\n1. Testing with specified test data:")
    print(f"   Persona ID: {persona_id} (Elena Marquez)")
    print(f"   Goal ID: {goal_id} (Sector Momentum Analysis)")
    print(f"   Reasoning Model: {reasoning_model}")
    print(f"   Reasoning Effort: {reasoning_effort}")
    print(f"   Max Turns: {max_turns} (for faster testing)")
    
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
    
    # Test 1: POST /api/simulations/run - Test with new model factory parameters
    try:
        run_payload = {
            "persona_id": persona_id,
            "goal_id": goal_id,
            "reasoning_model": reasoning_model,
            "reasoning_effort": reasoning_effort,
            "max_turns": max_turns
        }
        
        print(f"Starting simulation with new parameters:")
        print(f"  - Persona: {persona_id} (Elena Marquez)")
        print(f"  - Goal: {goal_id} (Sector Momentum Analysis)")
        print(f"  - Reasoning Model: {reasoning_model}")
        print(f"  - Reasoning Effort: {reasoning_effort}")
        print(f"  - Max Turns: {max_turns}")
        
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
            returned_model = response_data.get("reasoning_model")
            returned_effort = response_data.get("reasoning_effort")
            
            if simulation_id and status == "running":
                print(f"✅ PASS: Simulation started successfully with new parameters!")
                print(f"   Simulation ID: {simulation_id}")
                print(f"   Status: {status}")
                print(f"   Reasoning Model: {returned_model}")
                print(f"   Reasoning Effort: {returned_effort}")
                
                # Verify model factory parameters are correctly returned
                if returned_model == reasoning_model and returned_effort == reasoning_effort:
                    print(f"✅ Model factory parameters correctly configured")
                    test_results.append(("POST /api/simulations/run", "PASS", f"Started simulation {simulation_id} with gpt-5/medium"))
                else:
                    print(f"⚠️  Model parameters mismatch: expected {reasoning_model}/{reasoning_effort}, got {returned_model}/{returned_effort}")
                    test_results.append(("POST /api/simulations/run", "PARTIAL", f"Started but parameter mismatch"))
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
    
    print("\n3. Testing GET /api/simulations/{simulation_id} (Poll Status)...")
    print("-" * 50)
    
    # Test 2: Poll simulation status if we have a simulation_id
    if simulation_id:
        print(f"Polling simulation status for: {simulation_id}")
        print("Will poll up to 10 times with 3-second intervals (30 seconds max)")
        print("Testing: TestEnvironment message handling and trajectory conversion")
        
        poll_count = 0
        max_polls = 10  # Reduced since max_turns=2 should complete faster
        poll_interval = 3
        
        while poll_count < max_polls:
            poll_count += 1
            
            try:
                print(f"\n   Poll #{poll_count}/{max_polls}...")
                
                get_response = requests.get(f"{BACKEND_URL}/simulations/{simulation_id}")
                
                if get_response.status_code == 200:
                    sim_data = get_response.json()
                    status = sim_data.get("status", "unknown")
                    current_turn = sim_data.get("current_turn", 0)
                    max_turns = sim_data.get("max_turns", 0)
                    goal_achieved = sim_data.get("goal_achieved")
                    trajectory = sim_data.get("trajectory", [])
                    
                    print(f"   Status: {status}")
                    print(f"   Turn: {current_turn}/{max_turns}")
                    print(f"   Goal Achieved: {goal_achieved}")
                    print(f"   Trajectory Messages: {len(trajectory)}")
                    
                    # Verify trajectory message format (LangGraph to LangChain conversion)
                    if trajectory:
                        latest_msg = trajectory[-1]
                        role = latest_msg.get("role", "unknown")
                        content = latest_msg.get("content", "")
                        
                        # Check for proper message structure
                        if role in ["user", "assistant", "system"] and content:
                            print(f"   ✅ Message format valid: {role} message with {len(content)} chars")
                            content_preview = content[:100] + "..." if len(content) > 100 else content
                            print(f"   Latest Message ({role}): {content_preview}")
                        else:
                            print(f"   ❌ Invalid message format: role='{role}', content_length={len(content)}")
                    
                    # Check for temperature-related errors (should not occur with reasoning models)
                    if "temperature" in str(sim_data).lower():
                        print(f"   ⚠️  Temperature mentioned in response - checking for errors...")
                        error = sim_data.get("error", "")
                        if "temperature" in error.lower():
                            print(f"   ❌ Temperature error detected: {error}")
                            test_results.append(("Temperature Error Check", "FAIL", f"Temperature error: {error}"))
                        else:
                            print(f"   ✅ No temperature-related errors")
                    
                    if status == "completed":
                        print(f"✅ SIMULATION COMPLETED WITH NEW MODEL FACTORY!")
                        print(f"   Final Status: {status}")
                        print(f"   Total Turns: {current_turn}")
                        print(f"   Goal Achieved: {goal_achieved}")
                        print(f"   Total Messages: {len(trajectory)}")
                        
                        # Verify realistic conversation occurred
                        if len(trajectory) >= 2:  # Should have at least user + assistant messages
                            print(f"   ✅ Realistic conversation generated ({len(trajectory)} messages)")
                            
                            # Check for Elena Marquez persona context
                            conversation_text = " ".join([msg.get("content", "") for msg in trajectory])
                            if any(term in conversation_text.lower() for term in ["momentum", "sector", "analysis", "investment"]):
                                print(f"   ✅ Conversation contains relevant financial/momentum analysis content")
                                test_results.append(("Realistic Conversation", "PASS", "Conversation relevant to persona/goal"))
                            else:
                                print(f"   ⚠️  Conversation may not be fully relevant to goal")
                                test_results.append(("Realistic Conversation", "PARTIAL", "Conversation generated but relevance unclear"))
                        else:
                            print(f"   ⚠️  Short conversation ({len(trajectory)} messages)")
                        
                        test_results.append(("Simulation Completion", "PASS", f"Completed in {current_turn} turns with gpt-5/medium"))
                        break
                    elif status == "failed":
                        error = sim_data.get("error", "Unknown error")
                        print(f"❌ SIMULATION FAILED: {error}")
                        test_results.append(("Simulation Completion", "FAIL", f"Failed: {error}"))
                        break
                    elif status == "running":
                        print(f"   ⏳ Still running... (turn {current_turn}/{max_turns})")
                        if poll_count < max_polls:
                            print(f"   Waiting {poll_interval} seconds before next poll...")
                            time.sleep(poll_interval)
                    else:
                        print(f"   ⚠️  Unknown status: {status}")
                        
                else:
                    print(f"❌ Error polling simulation: {get_response.status_code}")
                    print(f"   Response: {get_response.text}")
                    test_results.append(("GET /api/simulations/{id}", "FAIL", f"Status {get_response.status_code}"))
                    break
                    
            except Exception as e:
                print(f"❌ Exception during polling: {e}")
                test_results.append(("GET /api/simulations/{id}", "FAIL", f"Exception: {e}"))
                break
        
        if poll_count >= max_polls:
            print(f"\n⏰ Polling timeout after {max_polls * poll_interval} seconds")
            print("   With max_turns=2, simulation should complete faster")
            print("   Checking final status...")
            
            # One final check
            try:
                final_response = requests.get(f"{BACKEND_URL}/simulations/{simulation_id}")
                if final_response.status_code == 200:
                    final_data = final_response.json()
                    final_status = final_data.get("status")
                    final_turns = final_data.get("current_turn", 0)
                    final_trajectory = final_data.get("trajectory", [])
                    
                    print(f"   Final Status: {final_status}")
                    print(f"   Final Turns: {final_turns}")
                    print(f"   Final Messages: {len(final_trajectory)}")
                    
                    if final_status == "completed":
                        print(f"   ✅ Simulation completed after timeout")
                        test_results.append(("Simulation Completion", "PASS", f"Completed after {poll_count} polls"))
                    else:
                        print(f"   ⚠️  Simulation still {final_status} after timeout")
                        test_results.append(("Simulation Polling", "TIMEOUT", f"Still {final_status} after {poll_count} polls"))
                else:
                    test_results.append(("Simulation Polling", "TIMEOUT", f"Could not check final status"))
            except Exception as e:
                test_results.append(("Simulation Polling", "TIMEOUT", f"Exception checking final status: {e}"))
    
    else:
        print("⚠️  No simulation_id available, testing with fake ID...")
        
        # Test with non-existent ID
        fake_simulation_id = str(uuid.uuid4())
        print(f"Testing with non-existent simulation_id: {fake_simulation_id}")
        
        try:
            get_response = requests.get(f"{BACKEND_URL}/simulations/{fake_simulation_id}")
            
            if get_response.status_code == 404:
                response_data = get_response.json()
                if "Simulation not found" in response_data.get("detail", ""):
                    print("✅ PASS: Correctly returned 404 for non-existent simulation")
                    test_results.append(("GET /api/simulations/{id}", "PASS", "404 for non-existent simulation"))
                else:
                    print(f"❌ FAIL: Wrong error message: {response_data.get('detail')}")
                    test_results.append(("GET /api/simulations/{id}", "FAIL", f"Wrong error: {response_data.get('detail')}"))
            else:
                print(f"❌ FAIL: Expected 404, got {get_response.status_code}")
                test_results.append(("GET /api/simulations/{id}", "FAIL", f"Expected 404, got {get_response.status_code}"))
                
        except Exception as e:
            print(f"❌ Exception: {e}")
            test_results.append(("GET /api/simulations/{id}", "FAIL", f"Exception: {e}"))
    
    print("\n4. Testing Simulation Data Structure...")
    print("-" * 50)
    
    # Test 3: Verify simulation data structure if we have data
    if simulation_id:
        try:
            # Get final simulation state
            final_response = requests.get(f"{BACKEND_URL}/simulations/{simulation_id}")
            
            if final_response.status_code == 200:
                sim_data = final_response.json()
                
                print("Verifying simulation data structure:")
                
                # Check required fields
                required_fields = ["simulation_id", "status", "current_turn", "max_turns", "trajectory"]
                missing_fields = []
                
                for field in required_fields:
                    if field in sim_data:
                        print(f"   ✅ {field}: {type(sim_data[field]).__name__}")
                    else:
                        print(f"   ❌ {field}: MISSING")
                        missing_fields.append(field)
                
                # Check trajectory structure
                trajectory = sim_data.get("trajectory", [])
                if trajectory:
                    print(f"   ✅ trajectory contains {len(trajectory)} messages")
                    
                    # Check first message structure
                    first_msg = trajectory[0]
                    if "role" in first_msg and "content" in first_msg:
                        print(f"   ✅ Message structure: role='{first_msg['role']}', content length={len(first_msg['content'])}")
                    else:
                        print(f"   ❌ Invalid message structure: {first_msg}")
                        missing_fields.append("message_structure")
                else:
                    print(f"   ⚠️  trajectory is empty (may be normal if simulation just started)")
                
                # Check optional fields
                optional_fields = ["goal_achieved", "persona_id", "goal_id", "created_at"]
                for field in optional_fields:
                    if field in sim_data:
                        print(f"   ✅ {field}: {sim_data[field]}")
                
                if not missing_fields:
                    print("✅ PASS: All required fields present and correctly structured")
                    test_results.append(("Simulation Data Structure", "PASS", "All required fields present"))
                else:
                    print(f"❌ FAIL: Missing fields: {missing_fields}")
                    test_results.append(("Simulation Data Structure", "FAIL", f"Missing: {missing_fields}"))
            else:
                print(f"❌ Could not verify data structure (status {final_response.status_code})")
                test_results.append(("Simulation Data Structure", "FAIL", f"Could not retrieve data"))
                
        except Exception as e:
            print(f"❌ Exception verifying data structure: {e}")
            test_results.append(("Simulation Data Structure", "FAIL", f"Exception: {e}"))
    else:
        print("⚠️  No simulation data to verify (simulation didn't start)")
        test_results.append(("Simulation Data Structure", "SKIP", "No simulation data available"))
    
    print("\n5. Testing POST /api/simulations/{simulation_id}/stop (if needed)...")
    print("-" * 50)
    
    # Only test stop if simulation is still running
    if simulation_id:
        try:
            # Check current status
            status_response = requests.get(f"{BACKEND_URL}/simulations/{simulation_id}")
            if status_response.status_code == 200:
                sim_data = status_response.json()
                current_status = sim_data.get("status")
                
                if current_status == "running":
                    print(f"Simulation still running, testing stop endpoint...")
                    
                    stop_response = requests.post(f"{BACKEND_URL}/simulations/{simulation_id}/stop")
                    
                    if stop_response.status_code == 200:
                        print("✅ PASS: Stop endpoint returned 200")
                        test_results.append(("POST /api/simulations/{id}/stop", "PASS", "Successfully sent stop signal"))
                    else:
                        print(f"❌ FAIL: Stop returned {stop_response.status_code}")
                        test_results.append(("POST /api/simulations/{id}/stop", "FAIL", f"Status {stop_response.status_code}"))
                else:
                    print(f"Simulation already {current_status}, testing with fake ID...")
                    
                    # Test with non-existent ID
                    fake_id = str(uuid.uuid4())
                    stop_response = requests.post(f"{BACKEND_URL}/simulations/{fake_id}/stop")
                    
                    if stop_response.status_code == 404:
                        print("✅ PASS: Stop endpoint correctly returns 404 for non-existent simulation")
                        test_results.append(("POST /api/simulations/{id}/stop", "PASS", "404 for non-existent simulation"))
                    else:
                        print(f"❌ FAIL: Expected 404, got {stop_response.status_code}")
                        test_results.append(("POST /api/simulations/{id}/stop", "FAIL", f"Expected 404, got {stop_response.status_code}"))
            
        except Exception as e:
            print(f"❌ Exception testing stop: {e}")
            test_results.append(("POST /api/simulations/{id}/stop", "FAIL", f"Exception: {e}"))
    else:
        print("No simulation to stop, testing with fake ID...")
        
        fake_id = str(uuid.uuid4())
        try:
            stop_response = requests.post(f"{BACKEND_URL}/simulations/{fake_id}/stop")
            
            if stop_response.status_code == 404:
                print("✅ PASS: Stop endpoint correctly returns 404 for non-existent simulation")
                test_results.append(("POST /api/simulations/{id}/stop", "PASS", "404 for non-existent simulation"))
            else:
                print(f"❌ FAIL: Expected 404, got {stop_response.status_code}")
                test_results.append(("POST /api/simulations/{id}/stop", "FAIL", f"Expected 404, got {stop_response.status_code}"))
                
        except Exception as e:
            print(f"❌ Exception: {e}")
            test_results.append(("POST /api/simulations/{id}/stop", "FAIL", f"Exception: {e}"))
    
    print("\n6. Testing GET /api/simulations (List All)...")
    print("-" * 50)
    
    try:
        list_response = requests.get(f"{BACKEND_URL}/simulations")
        print(f"Response status: {list_response.status_code}")
        
        if list_response.status_code == 200:
            simulations = list_response.json()
            print(f"✅ PASS: Successfully retrieved {len(simulations)} simulations")
            
            # Show details of our simulation if it's in the list
            if simulation_id:
                our_sim = next((s for s in simulations if s.get("simulation_id") == simulation_id), None)
                if our_sim:
                    print(f"   Our simulation found in list:")
                    print(f"   - ID: {our_sim.get('simulation_id')}")
                    print(f"   - Status: {our_sim.get('status')}")
                    print(f"   - Turns: {our_sim.get('current_turn')}/{our_sim.get('max_turns')}")
            
            test_results.append(("GET /api/simulations", "PASS", f"Retrieved {len(simulations)} simulations"))
        else:
            print(f"❌ FAIL: Expected 200, got {list_response.status_code}")
            print(f"Response: {list_response.text}")
            test_results.append(("GET /api/simulations", "FAIL", f"Status {list_response.status_code}"))
            
    except Exception as e:
        print(f"❌ Exception during list test: {e}")
        test_results.append(("GET /api/simulations", "FAIL", f"Exception: {e}"))
    
    # Summary
    print("\n" + "=" * 60)
    print("SIMULATION FUNCTIONALITY TEST RESULTS")
    print("=" * 60)
    
    passed = 0
    failed = 0
    skipped = 0
    
    for endpoint, status, details in test_results:
        if status == "PASS":
            status_icon = "✅"
            passed += 1
        elif status == "SKIP":
            status_icon = "⏭️ "
            skipped += 1
        else:
            status_icon = "❌"
            failed += 1
            
        print(f"{status_icon} {endpoint}: {status}")
        print(f"   {details}")
    
    print(f"\nTotal: {passed} passed, {failed} failed, {skipped} skipped")
    
    # Overall assessment
    if simulation_id:
        print(f"\n🎯 SIMULATION ASSESSMENT:")
        print(f"   - LangGraph Integration: {'✅ WORKING' if passed > failed else '❌ ISSUES'}")
        print(f"   - Simulation ID Generated: {simulation_id}")
        print(f"   - Real-time Polling: {'✅ WORKING' if any('Poll' in r[0] for r in test_results if r[1] == 'PASS') else '❌ ISSUES'}")
    else:
        print(f"\n⚠️  SIMULATION ASSESSMENT:")
        print(f"   - LangGraph Integration: ❌ NOT WORKING")
        print(f"   - Issue: Could not start simulation")
    
    return failed == 0

if __name__ == "__main__":
    print(f"Testing backend at: {BACKEND_URL}")
    print(f"Test started at: {datetime.now()}")
    
    success = test_simulation_functionality()
    
    if success:
        print("\n🎉 All simulation functionality tests passed!")
        print("✅ LangGraph integration is working correctly")
        sys.exit(0)
    else:
        print("\n💥 Some simulation tests failed!")
        print("❌ Check LangGraph credentials or simulation engine setup")
        sys.exit(1)