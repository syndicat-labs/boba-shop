"""DRF exception handler mapping the AppError taxonomy to the ADR §15 envelope.

Envelope shape: {category, code, message, context, retryable, requestId}.
"""
import uuid

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

from core.errors import AppError, ErrorCategory

_CATEGORY_STATUS = {
    ErrorCategory.VALIDATION: status.HTTP_400_BAD_REQUEST,
    ErrorCategory.AUTHENTICATION: status.HTTP_401_UNAUTHORIZED,
    ErrorCategory.AUTHORIZATION: status.HTTP_403_FORBIDDEN,
    ErrorCategory.NOT_FOUND: status.HTTP_404_NOT_FOUND,
    ErrorCategory.EXTERNAL_DEPENDENCY: status.HTTP_502_BAD_GATEWAY,
    ErrorCategory.INTERNAL: status.HTTP_500_INTERNAL_SERVER_ERROR,
    ErrorCategory.RATE_LIMITED: status.HTTP_429_TOO_MANY_REQUESTS,
}


def _envelope(data: dict) -> dict:
    return {**data, "requestId": uuid.uuid4().hex}


def boba_exception_handler(exc, context):  # type: ignore[no-untyped-def]
    if isinstance(exc, AppError):
        return Response(_envelope(exc.to_dict()), status=_CATEGORY_STATUS[exc.category])

    response = exception_handler(exc, context)
    if response is not None:
        if isinstance(response.data, dict):
            response.data = _envelope({"category": "VALIDATION", **response.data})  # type: ignore[union-attr]
        else:
            response.data = _envelope(  # type: ignore[union-attr]
                {"category": "VALIDATION", "code": "DRF_ERROR", "message": str(response.data), "context": {}, "retryable": False}
            )
    return response
