# HTTP contract

`openapi.json` is generated from FastAPI/Pydantic, not maintained manually. From root:

```powershell
$env:PYTHONPATH='backend'
.venv/Scripts/python scripts/export_contract.py
```

Unix: `PYTHONPATH=backend .venv/bin/python scripts/export_contract.py`. Review contract diffs and update `frontend/src/features/complaints/types.ts` and consumers together. The contract contains no credentials or citizen data.
