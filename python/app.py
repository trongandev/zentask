import os
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse, Response
from fastapi.middleware.cors import CORSMiddleware
import edge_tts
import base64
from pydantic import BaseModel
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.get("/")
async def read_root():
    return {
        "message": "Zentask AI API",
        "endpoints": {
            "/edge-tts-stream": "GET - Get available TTS voices with streaming and caching"
        },
        "usage": "Usage: curl -o output.mp3 \"http://localhost:5080/edge-tts-stream?text=Hello,%20how%20are%20you?&voice=en-US-AriaNeural\""
    }


import hashlib

    
@app.get('/edge-tts')
async def get_edge_tts_voices(text: str, voice: str = "en-US-AriaNeural"):
    """API endpoint to return audio blob of text using edge-tts
    
    Args:
        text: Text to convert to speech
        voice: Voice ID (default: en-US-AriaNeural)
        
    Returns:
        Audio file as streaming response (audio/mpeg)
    """
    try:
        print(f"Generating TTS for text: {text[:50]}... with voice: {voice}")
        
        # Tạo communicate object với voice được chọn
        communicate = edge_tts.Communicate(text, voice)
        audio_data = b""
        
        # Stream audio chunks
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]
        
        # Trả về audio dưới dạng streaming response
        return Response(
            content=audio_data,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=speech.mp3",
                "Accept-Ranges": "bytes",
                "Cache-Control": "no-cache"
            }
        )
        
    except Exception as e:
        print(f"Error generating TTS: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating speech: {str(e)}")


@app.get('/edge-tts-stream')
async def get_edge_tts_voices_stream(text: str, voice: str = "en-US-AriaNeural"):
    """API endpoint to return audio blob of text using edge-tts with streaming and caching"""
    try:
        CACHE_DIR = "cache"
        if not os.path.exists(CACHE_DIR):
            os.makedirs(CACHE_DIR)
            
        filename_hash = hashlib.md5(f"{text}_{voice}".encode()).hexdigest()
        cache_path = os.path.join(CACHE_DIR, f"{filename_hash}.mp3")
        
        if os.path.exists(cache_path):
            print(f"Cache hit for {voice}: {text[:30]}...")
            def iterfile():
                with open(cache_path, mode="rb") as file_like:
                    # chunk size 4096 bytes
                    while chunk := file_like.read(4096):
                        yield chunk
            return StreamingResponse(
                iterfile(), 
                media_type="audio/mpeg", 
                headers={"Cache-Control": "public, max-age=31536000"}
            )
            
        print(f"Generating TTS for text: {text[:30]}... with voice: {voice}")
        
        async def audio_generator():
            communicate = edge_tts.Communicate(text, voice)
            audio_data = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data += chunk["data"]
                    yield chunk["data"]
            # After fully streaming, write to cache
            with open(cache_path, "wb") as f:
                f.write(audio_data)

        return StreamingResponse(
            audio_generator(),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=speech.mp3",
                "Cache-Control": "no-cache"
            }
        )
        
    except Exception as e:
        print(f"Error generating TTS: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating speech: {str(e)}")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5080)) 
    uvicorn.run(app, host="0.0.0.0", port=port)