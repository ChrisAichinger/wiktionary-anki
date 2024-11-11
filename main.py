from contextlib import asynccontextmanager
import re

from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import httpx
from pydantic_settings import BaseSettings, SettingsConfigDict

import ankitool, wiktionary

class Settings(BaseSettings):
    collection_file: str = "collection.anki2"
    deck: str
    sync_user: str
    sync_pass: str

    model_config = SettingsConfigDict(env_file=".env")


@asynccontextmanager
async def lifespan(app: FastAPI):
    ankitool.sync(settings.collection_file, settings.sync_user, settings.sync_pass)
    yield



settings = Settings()
app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")

@app.get("/", response_class=FileResponse)
async def main():
    return "frontend/dist/index.html"

@app.get("/word/{word}")
def load_word(word: str):
    return wiktionary.load_wiktionary(word)

@app.post("/add_note")
def add_note(note: ankitool.Note, background_tasks: BackgroundTasks):
    ankitool.import_note(settings.collection_file, settings.deck, note)
    background_tasks.add_task(ankitool.sync, settings.collection_file, settings.sync_user, settings.sync_pass)
    return {"status": "success", "message": "Note added"}

@app.get("/search/{word}")
async def search_word(word: str):
    sanitized_word = re.sub(r'[^\w ]', '', word, flags=re.UNICODE)
    url = f"https://en.wiktionary.org/w/api.php?action=opensearch&format=json&formatversion=2&search={sanitized_word}&namespace=0&limit=10"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
    return response.json()