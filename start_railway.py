#!/usr/bin/env python3
"""
Railway production startup script for JunkDrawer.Tools
Creates a unified FastAPI app that serves both static files and API endpoints
"""

import os
import sys
from pathlib import Path

# Add the LLMS converter backend to Python path
llms_path = Path(__file__).parent / "tools" / "llms-converter"
sys.path.insert(0, str(llms_path))

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Import the LLMS converter app
try:
    # Set the API root path environment variable before importing
    os.environ["API_ROOT_PATH"] = "/api"
    from app import app as llms_app
    LLMS_AVAILABLE = True
except ImportError:
    print("⚠️  LLMS converter backend not available")
    LLMS_AVAILABLE = False

# Create main app
app = FastAPI(title="JunkDrawer.Tools", version="1.0.0")

# Add CORS middleware to handle cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your domain
    allow_credentials=True,
    allow_methods=["*"],  # This ensures all HTTP methods are allowed
    allow_headers=["*"],
)

# Mount the LLMS converter API if available
if LLMS_AVAILABLE:
    app.mount("/api", llms_app, name="llms_api")
    print("✅ LLMS converter API mounted at /api")

    @app.post("/api/process-website")
    async def proxy_process_website(request: Request):
        # Forward the request to the mounted app
        return await llms_app.process_website(await request.json())

# Serve static files for the root directory
project_root = Path(__file__).parent

# Serve main pages
@app.get("/")
async def serve_index():
    return FileResponse(str(project_root / "index.html"))

@app.get("/styles.css")
async def serve_styles():
    return FileResponse(str(project_root / "styles.css"))

@app.get("/script.js")
async def serve_script():
    return FileResponse(str(project_root / "script.js"))

# Tool-specific routes
@app.get("/tools/alt-text-generator/")
async def serve_alt_text_tool():
    file_path = project_root / "tools" / "alt-text-generator" / "index.html"
    return FileResponse(str(file_path))

@app.get("/tools/alt-text-generator/{filename}")
async def serve_alt_text_files(filename: str):
    file_path = project_root / "tools" / "alt-text-generator" / filename
    if file_path.exists() and file_path.is_file():
        return FileResponse(str(file_path))
    return {"error": "File not found"}, 404

@app.get("/tools/llms-converter/")
async def serve_llms_tool():
    file_path = project_root / "tools" / "llms-converter" / "index.html"
    return FileResponse(str(file_path))

@app.get("/tools/llms-converter/{filename}")
async def serve_llms_files(filename: str):
    file_path = project_root / "tools" / "llms-converter" / filename
    if file_path.exists() and file_path.is_file():
        return FileResponse(str(file_path))
    return {"error": "File not found"}, 404

# Blog routes
@app.get("/blog/")
async def serve_blog_index():
    return FileResponse(str(project_root / "blog" / "index.html"))

@app.get("/blog/{path:path}")
async def serve_blog_files(path: str):
    file_path = project_root / "blog" / path
    # Handle directory requests by serving index.html
    if file_path.is_dir():
        index_path = file_path / "index.html"
        if index_path.exists():
            return FileResponse(str(index_path))
    elif file_path.exists() and file_path.is_file():
        return FileResponse(str(file_path))
    return {"error": "File not found"}, 404

# Mount static files for any remaining assets
app.mount("/", StaticFiles(directory=str(project_root), html=True), name="static")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print(f"🚀 Starting JunkDrawer.Tools on port {port}")
    
    if LLMS_AVAILABLE:
        print("✅ LLMS converter API available at /api")
        print(f"📚 API documentation at http://localhost:{port}/api/docs")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port,
        log_level="info"
    )