from pydantic import BaseModel, Field
from typing import Optional
import uuid

class TechnicianUnavailable(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    technician_name: str
    date: str  # YYYY-MM-DD format
    reason: Optional[str] = None
