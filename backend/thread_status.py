"""Simple thread status tracking for simulation UI.

Lightweight in-memory status per thread_id.
No complex session objects, just status flags.
"""

from threading import Lock
from typing import Dict, Optional

# Simple dict: {thread_id: {"status": "running"|"completed", "stopped_reason": "...", ...}}
thread_statuses: Dict[str, Dict] = {}
status_lock = Lock()


def set_thread_status(
    thread_id: str,
    status: str,
    stopped_reason: Optional[str] = None,
    current_turn: Optional[int] = None,
    max_turns: Optional[int] = None
) -> None:
    """Set status for a thread.
    
    Args:
        thread_id: LangGraph thread ID
        status: "running" | "completed" | "failed"
        stopped_reason: Why it stopped (e.g., "max_turns_reached", "should_stop_true", "error")
        current_turn: Current turn number
        max_turns: Maximum turns configured
    """
    with status_lock:
        if thread_id not in thread_statuses:
            thread_statuses[thread_id] = {}
        
        thread_statuses[thread_id]["status"] = status
        
        if stopped_reason:
            thread_statuses[thread_id]["stopped_reason"] = stopped_reason
        if current_turn is not None:
            thread_statuses[thread_id]["current_turn"] = current_turn
        if max_turns is not None:
            thread_statuses[thread_id]["max_turns"] = max_turns


def get_thread_status(thread_id: str) -> Dict:
    """Get status for a thread.
    
    Returns:
        Dict with status info, or {"status": "unknown"} if not found
    """
    with status_lock:
        return thread_statuses.get(thread_id, {"status": "unknown"})


def delete_thread_status(thread_id: str) -> None:
    """Remove status for a thread (cleanup)."""
    with status_lock:
        if thread_id in thread_statuses:
            del thread_statuses[thread_id]
