#!/usr/bin/env python3
"""
Railway production startup script for JunkDrawer.Tools
Creates a unified FastAPI app that serves both static files and API endpoints
"""

import os
import sys
from pathlib import Path

# No backend tools needed - all tools are frontend-only

from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Create main app FIRST
app = FastAPI(title="JunkDrawer.Tools", version="1.0.0")

# Add CORS middleware to handle cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your domain
    allow_credentials=True,
    allow_methods=["*"],  # This ensures all HTTP methods are allowed
    allow_headers=["*"],
)

# All tools are now frontend-only
LLMS_AVAILABLE = False

# No API mounting needed - all tools are frontend-only

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

# Serve sitemap and robots.txt
@app.get("/sitemap.xml")
async def serve_sitemap():
    file_path = project_root / "sitemap.xml"
    if file_path.exists():
        return FileResponse(str(file_path), media_type="application/xml")
    # If file doesn't exist, return 404
    raise HTTPException(status_code=404, detail="Sitemap not found")

@app.get("/robots.txt")
async def serve_robots():
    file_path = project_root / "robots.txt"
    if file_path.exists():
        return FileResponse(str(file_path), media_type="text/plain")
    # If file doesn't exist, return 404
    raise HTTPException(status_code=404, detail="Robots.txt not found")

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

@app.get("/tools/title-tag-counter/")
async def serve_title_tag_tool():
    file_path = project_root / "tools" / "title-tag-counter" / "index.html"
    return FileResponse(str(file_path))

@app.get("/tools/title-tag-counter/{filename}")
async def serve_title_tag_files(filename: str):
    file_path = project_root / "tools" / "title-tag-counter" / filename
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
    
    print("✅ All frontend tools ready")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port,
        log_level="info"
    )