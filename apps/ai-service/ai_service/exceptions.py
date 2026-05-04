"""Custom exceptions for AI Service."""


class AIServiceError(Exception):
    """Base exception for AI Service."""

    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class GraphNotReadyError(AIServiceError):
    """Raised when knowledge graph is not built or ready."""

    def __init__(self, message: str = "Knowledge graph not ready"):
        super().__init__(message, status_code=503)


class DatabaseError(AIServiceError):
    """Raised when database operations fail."""

    def __init__(self, message: str = "Database operation failed"):
        super().__init__(message, status_code=503)


class ExtractionError(AIServiceError):
    """Raised when knowledge extraction fails."""

    def __init__(self, message: str = "Knowledge extraction failed"):
        super().__init__(message, status_code=500)


class SearchError(AIServiceError):
    """Raised when search operations fail."""

    def __init__(self, message: str = "Search operation failed"):
        super().__init__(message, status_code=500)
