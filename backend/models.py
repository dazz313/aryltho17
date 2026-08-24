from pydantic import BaseModel, Field, BeforeValidator, ConfigDict, EmailStr
from typing import List, Optional, Annotated, Any
from datetime import datetime, timezone
from bson import ObjectId


def _validate_object_id(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    return str(v)


PyObjectId = Annotated[str, BeforeValidator(_validate_object_id)]


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


# ---------- Auth ----------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "owner"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ---------- Company ----------
class CompanySetup(BaseModel):
    name: str
    industry: str = "AC / Refrigeration Service"
    accounting_method: str = "Accrual"
    currency: str = "IDR"
    fiscal_year: int = 2025


# ---------- Import ----------
class MappingConfirm(BaseModel):
    filename: str
    rows: List[dict]
    mapping: dict  # {"date": "col_x", "description": "col_y", ...}


# ---------- AI ----------
class AskAIRequest(BaseModel):
    question: str
    session_id: Optional[str] = None
