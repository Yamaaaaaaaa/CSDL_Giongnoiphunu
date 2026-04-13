from fastapi import FastAPI, UploadFile, File, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os

from database import fetch_records, search_similar_voices
from audio_processor import process_audio_file

app = FastAPI(title="Voice Similarity API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RecordResponse(BaseModel):
    file_id: int
    speaker: str
    accent: Optional[str] = None
    gender: str
    age: Optional[int] = None
    file_path: str
    duration_sec: Optional[float] = None

class PaginatedRecords(BaseModel):
    total: int
    records: List[RecordResponse]

class SearchResultResponse(BaseModel):
    file_id: int
    speaker: str
    accent: Optional[str] = None
    gender: str
    age: Optional[int] = None
    file_path: str
    duration_sec: Optional[float] = None
    similarity: float

@app.get("/api/records", response_model=PaginatedRecords)
def get_records(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: str = Query("", description="Search by speaker ID"),
    gender: str = Query("", description="Filter by gender"),
    accent: str = Query("", description="Filter by accent")
):
    try:
        records, total = fetch_records(limit, offset, search, gender, accent)
        return {"total": total, "records": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/search", response_model=List[SearchResultResponse])
async def search_voice(file: UploadFile = File(...), top_k: int = Query(5, ge=1, le=20)):
    if not file.filename.endswith(".wav"):
        raise HTTPException(status_code=400, detail="Only .wav files are supported")
    
    try:
        # Read file bytes in memory
        file_bytes = await file.read()
        
        # Process and extract 99D vector
        embedding = process_audio_file(file_bytes)
        
        # Search DB
        results = search_similar_voices(embedding, top_k=top_k)
        
        return results
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing audio or searching database: {str(e)}")

# Thêm route tĩnh nếu cần thiết serve các file tĩnh từ data/processed
from fastapi.staticfiles import StaticFiles
data_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'data'))
if os.path.exists(data_path):
    app.mount("/data", StaticFiles(directory=data_path), name="data")
