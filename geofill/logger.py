import logging


class CustomFormatter(logging.Formatter):
    """Custom formatter that shows file:line only for errors and warnings."""
    
    FORMATS = {
        logging.DEBUG: "%(asctime)s [%(levelname)s] %(message)s",
        logging.INFO: "%(asctime)s [%(levelname)s] %(message)s",
        logging.WARNING: "%(asctime)s [%(levelname)s] %(message)s (%(filename)s:%(lineno)d)",
        logging.ERROR: "%(asctime)s [%(levelname)s] %(message)s (%(filename)s:%(lineno)d)",
        logging.CRITICAL: "%(asctime)s [%(levelname)s] %(message)s (%(filename)s:%(lineno)d)",
    }

    def format(self, record):
        log_fmt = self.FORMATS.get(record.levelno, self.FORMATS[logging.INFO])
        formatter = logging.Formatter(log_fmt)
        return formatter.format(record)


def setup_logging(level=logging.DEBUG):
    """Configure logging with custom formatter."""
    handler = logging.StreamHandler()
    handler.setFormatter(CustomFormatter())
    logging.basicConfig(level=level, handlers=[handler])
