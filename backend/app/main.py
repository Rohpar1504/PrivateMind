from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.embeddings import get_embedding_model
from app.routers import chat, documents, ingest, review, search, settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    get_embedding_model()  # warm up the model on startup
    yield


app = FastAPI(title="PrivateMind API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router)
app.include_router(documents.router)
app.include_router(search.router)
app.include_router(chat.router)
app.include_router(review.router)
app.include_router(settings.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
