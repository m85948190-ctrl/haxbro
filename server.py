#!/usr/bin/env python3
"""
HAxBRO — Your Own AI API Backend
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import os
import time

# ============================================================
# CONFIGURATION
# ============================================================

HF_TOKEN = os.environ.get("HF_TOKEN", "")
MODEL = "mistralai/Mistral-7B-Instruct-v0.3"
INFERENCE_URL = f"https://api-inference.huggingface.co/models/{MODEL}"

# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="HAxBRO AI API",
    description="Your own AI with Normal + Beast modes",
    version="1.0.0"
)

# CORS — allow ESP32 and website to call
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# REQUEST MODELS
# ============================================================

class ChatRequest(BaseModel):
    prompt: str
    mode: str = "normal"
    temperature: float = 0.7

class ChatResponse(BaseModel):
    response: str
    mode: str
    tokens: int = 0

# ============================================================
# ENDPOINTS
# ============================================================

@app.get("/")
async def root():
    return {
        "name": "HAxBRO AI",
        "version": "1.0.0",
        "modes": ["normal", "beast"],
        "status": "online"
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "model": MODEL}

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Main chat endpoint — calls your AI model via Hugging Face."""
    
    # System prompt based on mode
    if request.mode == "beast":
        system = "You are HAxBRO, a cybersecurity expert and tactical assistant. Provide educational security insights."
    else:
        system = "You are HAxBRO, a helpful AI assistant. Be friendly and informative."

    # Build the prompt for Mistral
    full_prompt = f"<s>[INST] {system}\n\nUser: {request.prompt} [/INST]"

    headers = {}
    if HF_TOKEN and HF_TOKEN != "":
        headers["Authorization"] = f"Bearer {HF_TOKEN}"

    payload = {
        "inputs": full_prompt,
        "parameters": {
            "max_new_tokens": 256,
            "return_full_text": False,
            "temperature": request.temperature,
        }
    }

    try:
        response = requests.post(INFERENCE_URL, headers=headers, json=payload, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                output = data[0].get("generated_text", "No response generated.")
            elif isinstance(data, dict):
                output = data.get("generated_text", "No response generated.")
            else:
                output = str(data)
            
            return ChatResponse(
                response=output.strip(),
                mode=request.mode,
                tokens=len(output.split())
            )
        
        elif response.status_code == 503:
            return ChatResponse(
                response="⚠️ Model is warming up. Please try again in 10 seconds.",
                mode=request.mode,
                tokens=0
            )
        else:
            return ChatResponse(
                response=f"⚠️ API Error: {response.status_code}",
                mode=request.mode,
                tokens=0
            )
            
    except requests.exceptions.Timeout:
        return ChatResponse(
            response="⚠️ Request timed out. Please try again.",
            mode=request.mode,
            tokens=0
        )
    except Exception as e:
        return ChatResponse(
            response=f"⚠️ Server Error: {str(e)}",
            mode=request.mode,
            tokens=0
        )

# ============================================================
# RUN THE SERVER
# ============================================================

if __name__ == "__main__":
    import uvicorn
    print("\n🔥 HAxBRO BACKEND STARTING...")
    print("📦 Model: " + MODEL)
    print("📍 API: http://localhost:8000")
    print("📡 Endpoint: http://localhost:8000/api/chat")
    print("🔌 Press Ctrl+C to stop")
    print("=" * 40)
    uvicorn.run(app, host="0.0.0.0", port=8000)
