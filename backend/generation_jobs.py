"""
In-memory job tracking for persona generation with polling support
"""
import asyncio
from datetime import datetime, timezone
from typing import Dict, Optional, Any
from dataclasses import dataclass, field
import uuid

@dataclass
class GenerationJob:
    """Tracks the status of a generation job"""
    id: str
    status: str = "pending"  # pending, running, completed, failed
    stage: str = "Initializing..."
    progress: int = 0
    error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    generation_time: Optional[float] = None

    def to_dict(self):
        return {
            "id": self.id,
            "status": self.status,
            "stage": self.stage,
            "progress": self.progress,
            "error": self.error,
            "result": self.result,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "generation_time": self.generation_time
        }

# In-memory storage for jobs (use Redis in production)
generation_jobs: Dict[str, GenerationJob] = {}

def create_job() -> GenerationJob:
    """Create a new generation job"""
    job_id = str(uuid.uuid4())
    job = GenerationJob(id=job_id)
    generation_jobs[job_id] = job
    return job

def get_job(job_id: str) -> Optional[GenerationJob]:
    """Get job by ID"""
    return generation_jobs.get(job_id)

def update_job(job_id: str, **kwargs):
    """Update job status"""
    job = generation_jobs.get(job_id)
    if job:
        for key, value in kwargs.items():
            setattr(job, key, value)

def cleanup_old_jobs(max_age_seconds: int = 3600):
    """Remove jobs older than max_age_seconds"""
    now = datetime.now(timezone.utc)
    to_remove = []
    
    for job_id, job in generation_jobs.items():
        age = (now - job.started_at).total_seconds()
        if age > max_age_seconds:
            to_remove.append(job_id)
    
    for job_id in to_remove:
        del generation_jobs[job_id]
