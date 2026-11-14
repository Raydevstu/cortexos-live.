from enum import Enum

class ProjectStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    BLOCKED = "blocked"
    COMPLETED = "completed"
    ARCHIVED = "archived"

class ProjectPhase(str, Enum):
    DISCOVERY = "discovery"
    PRODUCT = "product"
    DESIGN = "design"
    ARCHITECTURE = "architecture"
    DEVELOPMENT = "development"
    QA = "qa"
    RELEASE = "release"
    MAINTENANCE = "maintenance"

class ArtifactStatus(str, Enum):
    DRAFT = "draft"
    REVIEW = "review"
    APPROVED = "approved"
    INDEXED = "indexed"
    CONNECTED = "connected"
    ARCHIVED = "archived"

class AgentStatus(str, Enum):
    IDLE = "idle"
    PLANNING = "planning"
    EXECUTING = "executing"
    WAITING = "waiting"
    REVIEWING = "reviewing"
    BLOCKED = "blocked"
    COMPLETED = "completed"
    FAILED = "failed"
