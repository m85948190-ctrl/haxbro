from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import requests
import os
import time

app = FastAPI(title="HAxBRO AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    prompt: str
    mode: str = "normal"

# Free Hugging Face Inference API (no API key needed for public models)
HF_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3"

@app.get("/")
async def root():
    return {"status": "HAxBRO AI is running", "model": "Mistral-7B"}

@app.get("/healthz")
async def health():
    return {"status": "healthy"}

@app.post("/api/chat")
async def chat(request: ChatRequest):
    # System prompt based on mode
    if request.mode == "beast":
        system = "You are HAxBRO, a cybersecurity expert. Provide educational security insights."
    else:
        system = "You are HAxBRO, a helpful AI assistant. Be friendly and informative."
    
    # Build the prompt
    full_prompt = f"<s>[INST] {system}\n\nUser: {request.prompt} [/INST]"
    
    payload = {
        "inputs": full_prompt,
        "parameters": {
            "max_new_tokens": 256,
            "return_full_text": False,
            "temperature": 0.7
        }
    }
    
    try:
        response = requests.post(HF_URL, json=payload, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                output = data[0].get("generated_text", "No response")
            else:
                output = str(data)
            return {"response": output.strip(), "mode": request.mode}
        
        elif response.status_code == 503:
            return {"response": "⚠️ Model is warming up. Try again in 10 seconds.", "mode": request.mode}
        else:
            return {"response": f"⚠️ API Error: {response.status_code}", "mode": request.mode}
            
    except Exception as e:
        return {"response": f"⚠️ Server Error: {str(e)}", "mode": request.mode}
