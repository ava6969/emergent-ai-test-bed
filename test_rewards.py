#!/usr/bin/env python3
"""Test script to verify reward and stop persistence in simulations."""

import asyncio
import sys
import time
import requests
sys.path.insert(0, '/app/backend')

from testbed_bridge import simulation_engine

BACKEND_URL = "http://localhost:8001"

async def test_rewards():
    """Run a simulation and verify rewards are persisted."""
    
    print("\n" + "="*80)
    print("TESTING REWARDS & STOP PERSISTENCE")
    print("="*80)
    
    # 1. Get personas and goals
    print("\n1. Fetching personas and goals...")
    personas_resp = requests.get(f"{BACKEND_URL}/api/personas")
    goals_resp = requests.get(f"{BACKEND_URL}/api/goals")
    
    personas = personas_resp.json()
    goals = goals_resp.json()
    
    if not personas or not goals:
        print("❌ No personas or goals found. Please create them first.")
        return
    
    persona = personas[0]
    goal = goals[0]
    
    print(f"   Using Persona: {persona['name']}")
    print(f"   Using Goal: {goal['name']}")
    
    # 2. Start simulation
    print("\n2. Starting simulation...")
    sim_resp = requests.post(f"{BACKEND_URL}/api/simulations/run", json={
        "persona_id": persona['id'],
        "goal_id": goal['id'],
        "model": "gpt-4.1",
        "reasoning_effort": "medium",
        "max_turns": 3  # Short test
    })
    
    if sim_resp.status_code != 200:
        print(f"❌ Failed to start simulation: {sim_resp.text}")
        return
    
    sim_data = sim_resp.json()
    thread_id = sim_data.get('thread_id')
    
    print(f"   ✅ Simulation started: {thread_id}")
    
    # 3. Poll for completion
    print("\n3. Waiting for simulation to complete...")
    for i in range(120):  # 2 minutes max
        await asyncio.sleep(1)
        
        status_resp = requests.get(f"{BACKEND_URL}/api/threads/{thread_id}/status")
        status = status_resp.json()
        
        if status.get('status') == 'completed':
            print(f"   ✅ Simulation completed in {i+1} seconds")
            break
        
        if i % 10 == 0 and i > 0:
            print(f"   ⏱️  Still running... {i}s (Turn {status.get('current_turn', 0)}/{status.get('max_turns', 0)})")
    
    # 4. Get final state and check messages
    print("\n4. Checking messages for rewards and stop flags...")
    
    state = await simulation_engine.epoch_client.client.threads.get_state(thread_id)
    messages = state.get("values", {}).get("messages", [])
    
    print(f"   Total messages: {len(messages)}")
    
    # Analyze messages
    human_messages = []
    total_reward = 0
    stop_count = 0
    
    for i, msg in enumerate(messages):
        if isinstance(msg, dict):
            msg_type = msg.get("type")
            additional = msg.get("additional_kwargs", {})
            reward = additional.get("reward")
            stop = additional.get("stop")
            
            if msg_type == "human":
                human_messages.append({
                    "index": i,
                    "content": msg.get("content", "")[:50],
                    "reward": reward,
                    "stop": stop
                })
                
                if reward is not None:
                    total_reward += reward
                    print(f"   Message {i} (human): reward={reward}, stop={stop}")
                if stop:
                    stop_count += 1
    
    print(f"\n5. RESULTS:")
    print(f"   Human messages with rewards: {len([m for m in human_messages if m['reward'] is not None])}/{len(human_messages)}")
    print(f"   Total reward: {total_reward}")
    print(f"   Stop flags: {stop_count}")
    print(f"   Final status: {status.get('status')}")
    
    # Display sample messages
    print(f"\n6. Sample Human Messages:")
    for msg in human_messages[:5]:  # Show first 5
        print(f"   [{msg['index']}] {msg['content']}... → reward={msg['reward']}, stop={msg['stop']}")
    
    # Verify rewards match what UI would show
    print(f"\n7. What UI should display:")
    positive = sum(m['reward'] for m in human_messages if m['reward'] and m['reward'] > 0)
    negative = sum(abs(m['reward']) for m in human_messages if m['reward'] and m['reward'] < 0)
    print(f"   Total Score: {total_reward}")
    print(f"   Positive Rewards: +{positive}")
    print(f"   Penalties: -{negative}")
    
    if total_reward == 0 and all(m['reward'] is None for m in human_messages):
        print("\n❌ WARNING: No rewards found in messages!")
        print("   This means additional_kwargs are not being persisted to LangGraph.")
    else:
        print("\n✅ SUCCESS: Rewards are being persisted correctly!")
    
    print("\n" + "="*80)

if __name__ == "__main__":
    asyncio.run(test_rewards())
