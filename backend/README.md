# Setup

* Python version doesn't really matter, we use 3.11
* Please use [FastAPI](https://fastapi.tiangolo.com/) (sort of setup in main.py) and the [OpenAI library](https://github.com/openai/openai-python)

---

### Additional Dependencies

* **LangGraph** – orchestrates the LLM agent and routes function calls.
* **SQLModel** – typed ORM built on top of SQL-Alchemy & Pydantic; we will use
  it to persist orders in an on-disk SQLite database.
* **sse-starlette** – will allow us to stream server-sent events for real-time
  UI updates in a future phase.

All required packages are now listed in `pyproject.toml`.  Install everything
with Poetry:

```bash
cd backend
poetry install
```
