#!/usr/bin/env python3
"""
Railway production startup script for JunkDrawer.Tools
Simplified approach - serve everything from the LLMS app
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
    # Use the LLMS app as the main app
    app = llms_app
    
    # Add static file serving to the existing app
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
    
    # Tool pages
    @app.get("/tools/alt-text-generator/")
    async def serve_alt_text_tool():
        file_path = project_root / "tools" / "alt-text-generator" / "index.html"
        return FileResponse(str(file_path))
    
    @app.get("/tools/llms-converter/")
    async def serve_llms_tool():
        file_path = project_root / "tools" / "llms-converter" / "index.html"
        return FileResponse(str(file_path))
    
    @app.get("/tools/{tool}/{filename:path}")
    async def serve_tool_files(tool: str, filename: str):
        file_path = project_root / "tools" / tool / filename
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
        if file_path.is_dir():
            index_path = file_path / "index.html"
            if index_path.exists():
                return FileResponse(str(index_path))
        elif file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return {"error": "File not found"}, 404
    
    # Mount static files for remaining assets
    app.mount("/", StaticFiles(directory=str(project_root), html=True), name="static")
    
    print("✅ Using LLMS app as main app with added static routes")
    
except ImportError as e:
    print(f"❌ Cannot start - LLMS converter backend required: {e}")
    sys.exit(1)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print(f"🚀 Starting JunkDrawer.Tools on port {port}")
    print("✅ API endpoints available at root level")
    print(f"📚 API documentation at http://localhost:{port}/docs")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port,
        log_level="info"
    )