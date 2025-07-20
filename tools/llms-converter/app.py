#!/usr/bin/env python3
"""
FastAPI server for LLMS.txt Converter
Handles URL processing and LLMS.txt file generation
"""

import asyncio
import json
import os
import tempfile
import time
from typing import Dict, Optional
import uuid
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, HttpUrl
import uvicorn

# Import our backend processors
from backend.url_processor import URLProcessor
from backend.categorizer import Categorizer
from backend.llms_generator import LLMSGenerator

app = FastAPI(title="LLMS.txt Converter API", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for job status (in production, use Redis or database)
job_status: Dict[str, Dict] = {}
generated_files: Dict[str, str] = {}

class ProcessRequest(BaseModel):
    website_url: HttpUrl
    max_pages: int = 100
    filename: str = "LLMS"
    use_ai: bool = False
    api_key: Optional[str] = None

class JobStatus(BaseModel):
    job_id: str
    status: str  # "processing", "completed", "error"
    progress: int  # 0-100
    message: str
    result: Optional[Dict] = None
    error: Optional[str] = None

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "LLMS.txt Converter API is running"}

@app.post("/process-website")
async def process_website(request: ProcessRequest, background_tasks: BackgroundTasks):
    """Start website processing job"""
    job_id = str(uuid.uuid4())
    
    # Initialize job status
    job_status[job_id] = {
        "status": "processing",
        "progress": 0,
        "message": "Initializing...",
        "started_at": time.time()
    }
    
    # Start background processing
    background_tasks.add_task(
        process_website_background,
        job_id,
        str(request.website_url),
        request.max_pages,
        request.filename,
        request.use_ai,
        request.api_key
    )
    
    return {"job_id": job_id, "status": "started"}

@app.get("/job-status/{job_id}")
async def get_job_status(job_id: str):
    """Get status of processing job"""
    if job_id not in job_status:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job_status[job_id]

@app.get("/download/{job_id}/{file_type}")
async def download_file(job_id: str, file_type: str):
    """Download generated files"""
    if job_id not in job_status:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job_status[job_id]["status"] != "completed":
        raise HTTPException(status_code=400, detail="Job not completed")
    
    file_key = f"{job_id}_{file_type}"
    if file_key not in generated_files:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_path = generated_files[file_key]
    
    if file_type == "txt":
        media_type = "text/plain"
        filename = f"{job_status[job_id].get('filename', 'LLMS')}.txt"
    elif file_type == "json":
        media_type = "application/json"
        filename = f"{job_status[job_id].get('filename', 'LLMS')}.json"
    else:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=filename
    )

async def process_website_background(
    job_id: str,
    website_url: str,
    max_pages: int,
    filename: str,
    use_ai: bool,
    api_key: Optional[str]
):
    """Background task to process website"""
    try:
        # Update progress callback with enhanced details
        def update_progress(current: int, total: int, message: str, phase: str = "processing"):
            progress = int((current / total) * 100) if total > 0 else 0
            job_status[job_id].update({
                "progress": progress,
                "message": message,
                "phase": phase,
                "current_page": current,
                "total_pages": total
            })
        
        # Step 1: Initialize URL processor
        update_progress(0, 100, "Setting up website crawler...", "crawling")
        processor = URLProcessor(website_url, max_pages=max_pages, delay=1.0)
        
        # Step 2: Crawl website
        update_progress(5, 100, "Discovering pages via sitemap...", "crawling")
        crawl_result = processor.process_website(
            progress_callback=lambda c, t, m: update_progress(5 + int((c/t) * 50), 100, f"Crawling page {c} of {t}...", "processing")
        )
        
        if not crawl_result['pages']:
            raise Exception("No valid pages found on the website")
        
        # Step 3: Categorize content
        update_progress(55, 100, f"Categorizing {len(crawl_result['pages'])} pages...", "categorizing")
        categorizer = Categorizer(use_gpt=use_ai, api_key=api_key if use_ai else None)
        
        if use_ai and api_key:
            update_progress(60, 100, "Enhancing content with AI...", "enhancing")
        
        categorized_data = categorizer.categorize_pages(crawl_result['pages'], crawl_result['site_metadata'])
        
        # Step 4: Generate LLMS.txt
        update_progress(85, 100, "Generating LLMS.txt file...", "generating")
        
        generator = LLMSGenerator()
        
        # Generate files
        update_progress(95, 100, "Creating downloadable files...", "generating")
        
        llms_content = generator.generate_markdown(crawl_result['site_metadata'], categorized_data)
        
        # Create metadata using the generator
        metadata = generator.generate_json(crawl_result['site_metadata'], categorized_data, crawl_result['stats'])
        metadata["metadata"]["ai_enhanced"] = use_ai and api_key is not None
        
        # Save files to temporary location
        txt_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
        json_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
        
        txt_file.write(llms_content)
        txt_file.close()
        
        json_file.write(json.dumps(metadata, indent=2, ensure_ascii=False))
        json_file.close()
        
        # Store file paths
        generated_files[f"{job_id}_txt"] = txt_file.name
        generated_files[f"{job_id}_json"] = json_file.name
        
        # Calculate category stats
        category_stats = {}
        for category, pages in categorized_data.items():
            category_stats[category] = len(pages)
        
        # Complete job
        update_progress(100, 100, "Conversion complete!")
        job_status[job_id].update({
            "status": "completed",
            "progress": 100,
            "message": "Conversion completed successfully!",
            "filename": filename,
            "result": {
                "stats": {
                    "total_rows": crawl_result['stats']['total_rows'],
                    "indexable_pages": crawl_result['stats']['indexable_pages'],
                    "unique_pages": crawl_result['stats']['unique_pages'],
                    "ai_enhanced": use_ai and api_key is not None
                },
                "categories": category_stats,
                "preview": llms_content[:1000] + "..." if len(llms_content) > 1000 else llms_content
            }
        })
        
    except Exception as e:
        job_status[job_id].update({
            "status": "error",
            "error": str(e),
            "message": f"Error: {str(e)}"
        })

# Cleanup task to remove old files and job statuses
@app.on_event("startup")
async def startup_event():
    """Startup tasks"""
    print("LLMS.txt Converter API starting up...")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    # Clean up temporary files
    for file_path in generated_files.values():
        try:
            os.unlink(file_path)
        except:
            pass

if __name__ == "__main__":
    # For development
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )