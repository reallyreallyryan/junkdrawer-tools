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

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn

# Import the LLMS converter app
try:
    from app import app as llms_app
    LLMS_AVAILABLE = True
except ImportError:
    print("⚠️  LLMS converter backend not available")
    LLMS_AVAILABLE = False

# Create main app
app = FastAPI(title="JunkDrawer.Tools", version="1.0.0")

# Mount the LLMS converter API if available
if LLMS_AVAILABLE:
    app.mount("/api", llms_app)
    print("✅ LLMS converter API mounted at /api")

# Serve static files
project_root = Path(__file__).parent
app.mount("/static", StaticFiles(directory=str(project_root)), name="static")

# Serve main pages
@app.get("/")
async def serve_index():
    return FileResponse(str(project_root / "index.html"))

@app.get("/tools/alt-text-generator/")
async def serve_alt_text_tool():
    return FileResponse(str(project_root / "tools" / "alt-text-generator" / "index.html"))

@app.get("/tools/llms-converter/")
async def serve_llms_tool():
    return FileResponse(str(project_root / "tools" / "llms-converter" / "index.html"))

# Catch-all for other static files
@app.get("/{full_path:path}")
async def serve_static_files(full_path: str):
    file_path = project_root / full_path
    if file_path.exists() and file_path.is_file():
        return FileResponse(str(file_path))
    return {"error": "File not found"}, 404

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print(f"🚀 Starting JunkDrawer.Tools on port {port}")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port,
        log_level="info"
    )