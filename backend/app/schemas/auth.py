"""Authentication and User schemas."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"


class UserRegister(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(pattern=EMAIL_REGEX, min_length=5, max_length=255)
    password: str = Field(min_length=6, max_length=128)
    full_name: str = Field(min_length=2, max_length=100)


class UserLogin(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(pattern=EMAIL_REGEX, min_length=5, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str | None = Field(default=None, min_length=2, max_length=100)
    current_password: str | None = None
    new_password: str | None = Field(default=None, min_length=6, max_length=128)
