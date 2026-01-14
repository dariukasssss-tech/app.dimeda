from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
import uuid
from datetime import datetime, timezone

class ProductBase(BaseModel):
    serial_number: str
    model_name: str  # One of VALID_MODELS
    city: str  # One of the 5 cities
    location_detail: Optional[str] = None  # Hospital name, ward, etc.
    notes: Optional[str] = None
    registration_date: Optional[str] = None  # Custom registration date

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    registration_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = "active"
