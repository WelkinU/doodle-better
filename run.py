"""Run the Doodle Better server."""

import uvicorn

from backend.config import config

if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host=config.host,
        port=config.port,
        reload=False,
    )
