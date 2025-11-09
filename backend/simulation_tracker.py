"""Real-time simulation tracking for streaming trajectory updates."""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from threading import Lock

simulation_sessions: Dict[str, Dict[str, Any]] = {}
session_lock = Lock()

def create_simulation_session(simulation_id: str, persona_id: str, goal_id: str, max_turns: int) -> Dict[str, Any]:
    """Create a new simulation tracking session."""
    with session_lock:
        session = {
            "simulation_id": simulation_id,
            "persona_id": persona_id,
            "goal_id": goal_id,
            "max_turns": max_turns,
            "status": "running",
            "current_turn": 0,
            "trajectory": [],
            "started_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None,
            "error": None,
            "goal_achieved": False,
            "should_stop": False  # Flag for stop signal
        }
        simulation_sessions[simulation_id] = session
        return session

def update_simulation_session(
    simulation_id: str,
    status: Optional[str] = None,
    current_turn: Optional[int] = None,
    new_messages: Optional[List[Dict[str, Any]]] = None,
    goal_achieved: Optional[bool] = None,
    error: Optional[str] = None
):
    """Update simulation session with new data."""
    with session_lock:
        if simulation_id not in simulation_sessions:
            return
        
        session = simulation_sessions[simulation_id]
        
        if status:
            session["status"] = status
        if current_turn is not None:
            session["current_turn"] = current_turn
        if new_messages:
            session["trajectory"].extend(new_messages)
        if goal_achieved is not None:
            session["goal_achieved"] = goal_achieved
        if error:
            session["error"] = error
        
        if status in ["completed", "failed", "stopped"]:
            session["completed_at"] = datetime.now(timezone.utc).isoformat()

def get_simulation_session(simulation_id: str) -> Optional[Dict[str, Any]]:
    """Get current simulation session state."""
    with session_lock:
        return simulation_sessions.get(simulation_id)

def stop_simulation(simulation_id: str) -> bool:
    """Signal simulation to stop."""
    with session_lock:
        if simulation_id in simulation_sessions:
            simulation_sessions[simulation_id]["should_stop"] = True
            return True
        return False

def should_stop_simulation(simulation_id: str) -> bool:
    """Check if simulation should stop."""
    with session_lock:
        session = simulation_sessions.get(simulation_id)
        return session.get("should_stop", False) if session else False

def list_simulation_sessions() -> List[Dict[str, Any]]:
    """List all simulation sessions."""
    with session_lock:
        return list(simulation_sessions.values())

def cleanup_old_sessions(max_age_hours: int = 24):
    """Remove old completed sessions."""
    with session_lock:
        from datetime import timedelta
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=max_age_hours)).isoformat()
        
        to_remove = []
        for sim_id, session in simulation_sessions.items():
            if session.get("completed_at") and session["completed_at"] < cutoff:
                to_remove.append(sim_id)
        
        for sim_id in to_remove:
            del simulation_sessions[sim_id]
