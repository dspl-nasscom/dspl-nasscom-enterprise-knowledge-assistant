"""Structured JSON logging setup using structlog."""

import logging
import os
import sys

import structlog

from app.core.config import settings


def setup_logging() -> None:
    """Configure structlog + stdlib logging for the application.

    In development: renders colourful key=value output.
    In production/GCP: emits one JSON object per log line compatible with GCP.
    """
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)

    # Automatically detect GCP/Cloud Run environment (via K_SERVICE) or standard production
    is_gcp = bool(os.environ.get("K_SERVICE"))
    is_production = settings.log_env.lower() == "production" or is_gcp

    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
    ]

    if is_production:
        def gcp_log_formatter(logger, method_name, event_dict):
            """Format logs for GCP structured logging.

            Maps 'level' to 'severity' (uppercase) and 'event' to 'message'.
            """
            level = event_dict.pop("level", None) or event_dict.pop("levelname", None)
            if level:
                event_dict["severity"] = str(level).upper()
            elif "severity" not in event_dict:
                event_dict["severity"] = "INFO"

            if "event" in event_dict:
                event_dict["message"] = event_dict.pop("event")
            return event_dict

        processors = [
            *shared_processors,
            gcp_log_formatter,
            structlog.processors.ExceptionRenderer(),
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ]

        formatter = structlog.stdlib.ProcessorFormatter(
            processor=structlog.processors.JSONRenderer(),
            foreign_pre_chain=[
                *shared_processors,
                structlog.processors.ExceptionRenderer(),
                gcp_log_formatter,
            ],
        )
    else:
        processors = [
            *shared_processors,
            structlog.processors.ExceptionRenderer(),
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ]

        formatter = structlog.stdlib.ProcessorFormatter(
            processor=structlog.dev.ConsoleRenderer(colors=True),
            foreign_pre_chain=[
                *shared_processors,
                structlog.processors.ExceptionRenderer(),
            ],
        )

    structlog.configure(
        processors=processors,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        cache_logger_on_first_use=True,
    )

    # Configure root standard logger to format all logs uniformly
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    
    root_logger = logging.getLogger()
    root_logger.handlers = []
    root_logger.addHandler(handler)
    root_logger.setLevel(log_level)

    # Intercept server and FastAPI loggers so they propagate to root
    for logger_name in ["uvicorn", "uvicorn.error", "uvicorn.access", "fastapi"]:
        u_logger = logging.getLogger(logger_name)
        u_logger.handlers = []
        u_logger.propagate = True

    # Silence noisy third-party loggers in production/GCP
    if is_production:
        for noisy_lib in ["httpx", "httpcore", "chromadb", "sentence_transformers", "openai"]:
            logging.getLogger(noisy_lib).setLevel(logging.WARNING)


def get_logger(name: str = __name__):
    """Return a bound structlog logger for a given module."""
    return structlog.get_logger(name)
