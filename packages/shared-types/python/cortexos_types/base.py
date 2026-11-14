from __future__ import annotations

from datetime import datetime
from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(word.capitalize() for word in parts[1:])


class CortexModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        use_enum_values=True,
    )


class BaseEntity(CortexModel):
    id: str
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None
    created_by: str | None = None
    updated_by: str | None = None
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class BaseObject(BaseEntity):
    title: str
    summary: str


class TenantScopedEntity(BaseEntity):
    organization_id: str


class PaginationParams(CortexModel):
    limit: int | None = None
    offset: int | None = None
    cursor: str | None = None


T = TypeVar("T")


class PaginatedResponse(CortexModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int
    next_cursor: str | None = None


class ApiError(CortexModel):
    code: str
    message: str
    details: dict[str, Any] | None = None
    request_id: str | None = None
    timestamp: datetime


class HealthCheckResponse(CortexModel):
    service: str
    status: Literal["healthy", "degraded", "unhealthy"]
    version: str
    timestamp: datetime
    dependencies: dict[str, Literal["healthy", "degraded", "unhealthy"]] | None = None
