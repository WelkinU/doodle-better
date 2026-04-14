"""Run the Doodle Better server."""

import copy

import uvicorn
import uvicorn.config

from backend.config import config

_log_config = copy.deepcopy(uvicorn.config.LOGGING_CONFIG)
_log_config["formatters"]["default"]["fmt"] = "%(asctime)s %(levelprefix)s %(message)s"
_log_config["formatters"]["default"]["datefmt"] = "%Y-%m-%d %H:%M:%S"
_log_config["formatters"]["access"]["fmt"] = (
    '%(asctime)s %(levelprefix)s %(client_addr)s - "%(request_line)s" %(status_code)s'
)
_log_config["formatters"]["access"]["datefmt"] = "%Y-%m-%d %H:%M:%S"

if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host=config.host,
        port=config.port,
        reload=False,
        log_config=_log_config,
    )
