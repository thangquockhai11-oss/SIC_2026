# TrustMedia AI backend

FastAPI modular monolith entry point. The root README documents full-stack setup.

From this directory, create and activate a Python virtual environment, then install the package and development tools:

- python -m venv .venv
- .\.venv\Scripts\Activate.ps1
- python -m pip install -e '.[dev]'
- uvicorn app.main:app --reload

The application reads TRUSTMEDIA_* variables; copy .env.example to .env. PostgreSQL and Redis should be running for /api/v1/ready. The health and dataset routes work without those services.

Run route tests with python -m pytest. The current dataset catalog is metadata only and remains UNVERIFIED.
