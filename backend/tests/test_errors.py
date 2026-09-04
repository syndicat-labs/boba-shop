
import pytest

from core.errors import AppError, ErrorCategory
from core.errors import taxonomy as err


def test_validation_error_envelope():
    e = err.validation("BAD_INPUT", "bad", {"field": "x"})
    assert e.category is ErrorCategory.VALIDATION
    assert e.retryable is False
    d = e.to_dict()
    assert d["code"] == "BAD_INPUT"
    assert d["message"] == "bad"
    assert d["context"] == {"field": "x"}
    assert d["category"] == "VALIDATION"
    assert d["retryable"] is False


def test_rate_limited_is_retryable():
    e = err.rate_limited("SLOW_DOWN", "slow")
    assert e.retryable is True
    assert e.category is ErrorCategory.RATE_LIMITED


def test_external_dependency_defaults_retryable():
    e = err.external_dependency("PSP_DOWN", "down")
    assert e.retryable is True
    assert e.category is ErrorCategory.EXTERNAL_DEPENDENCY


def test_app_error_is_exception():
    e = err.internal("BOOM", "boom")
    assert isinstance(e, AppError)
    assert isinstance(e, Exception)
    with pytest.raises(AppError):
        raise e
