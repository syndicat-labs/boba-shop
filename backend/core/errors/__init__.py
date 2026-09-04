from dataclasses import dataclass
from enum import Enum


class ErrorCategory(str, Enum):
    VALIDATION = "VALIDATION"
    AUTHENTICATION = "AUTHENTICATION"
    AUTHORIZATION = "AUTHORIZATION"
    NOT_FOUND = "NOT_FOUND"
    EXTERNAL_DEPENDENCY = "EXTERNAL_DEPENDENCY"
    INTERNAL = "INTERNAL"
    RATE_LIMITED = "RATE_LIMITED"


@dataclass(frozen=True)
class AppError(Exception):
    category: ErrorCategory
    code: str
    message: str
    context: dict[str, object]
    retryable: bool = False

    def to_dict(self) -> dict[str, object]:
        return {
            "category": self.category.value,
            "code": self.code,
            "message": self.message,
            "context": self.context,
            "retryable": self.retryable,
        }


class DomainError(AppError):
    pass
