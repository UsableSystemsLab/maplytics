class ComparisonError(Exception):
    """Structured error raised by the comparison handler."""

    def __init__(self, code: str, message: str):
        super().__init__(f"{code}: {message}")
        self.code = code
        self.message = message


class LocationResolutionError(Exception):
    """Raised when the api_server cannot resolve location names."""

    def __init__(self, details=None):
        super().__init__("location_unresolved")
        self.details = details or {}


class QueryParseError(ComparisonError):
    def __init__(self, message: str):
        super().__init__("query_unparseable", message)
