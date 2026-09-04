from . import AppError, ErrorCategory


def validation(code: str, message: str, context: dict[str, object] | None = None) -> AppError:
    return AppError(ErrorCategory.VALIDATION, code, message, context or {}, False)


def authentication(code: str, message: str, context: dict[str, object] | None = None) -> AppError:
    return AppError(ErrorCategory.AUTHENTICATION, code, message, context or {}, False)


def authorization(code: str, message: str, context: dict[str, object] | None = None) -> AppError:
    return AppError(ErrorCategory.AUTHORIZATION, code, message, context or {}, False)


def not_found(code: str, message: str, context: dict[str, object] | None = None) -> AppError:
    return AppError(ErrorCategory.NOT_FOUND, code, message, context or {}, False)


def external_dependency(code: str, message: str, context: dict[str, object] | None = None, retryable: bool = True) -> AppError:
    return AppError(ErrorCategory.EXTERNAL_DEPENDENCY, code, message, context or {}, retryable)


def internal(code: str, message: str, context: dict[str, object] | None = None) -> AppError:
    return AppError(ErrorCategory.INTERNAL, code, message, context or {}, False)


def rate_limited(code: str, message: str, context: dict[str, object] | None = None) -> AppError:
    return AppError(ErrorCategory.RATE_LIMITED, code, message, context or {}, True)
