# Optional ResumeIQ Python NLP service

This service is optional. The hosted Hatchable application has a native JavaScript analysis engine and remains usable when this service is not deployed.

## Run locally

```bash
cd public/python-service
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Health check: `GET http://127.0.0.1:8000/health`.
Analysis endpoint: `POST http://127.0.0.1:8000/analyze` with JSON fields `resumeText`, `jobDescription`, `jobTitle`, and optional `selectedSkills`.

## Deploy and connect

Deploy this folder as a separate Python web service (for example, to a Python-capable host that supports FastAPI). Configure HTTPS, request-size limits, timeouts, and access controls. Do not use a public unrestricted endpoint for sensitive resume content. If connecting it to ResumeIQ, explicitly disclose that resume text will be sent to the external service and obtain consent first. Set the ResumeIQ Hatchable project configuration value `python_service_url` to the service base URL. The current hosted MVP does not call this optional service automatically; native JavaScript analysis is the active engine until an explicit consented integration is enabled and verified.

The service processes text in memory and does not persist resumes. Do not log request bodies. TF-IDF is a text similarity baseline, not a semantic model or hiring probability.