#!/usr/bin/env python3
"""
Development startup script for LLMS.txt Converter
Starts both the static file server and the FastAPI backend
"""

import subprocess
import sys
import time
import os
from pathlib import Path

def start_servers():
    """Start both frontend and backend servers"""
    
    # Change to the tool directory
    tool_dir = Path(__file__).parent
    os.chdir(tool_dir)
    
    print("🚀 Starting LLMS.txt Converter Development Servers...")
    print("=" * 50)
    
    try:
        # Start FastAPI backend on port 8001
        print("📡 Starting FastAPI backend on http://localhost:8001")
        backend_process = subprocess.Popen([
            sys.executable, "app.py"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Wait a moment for backend to start
        time.sleep(2)
        
        # Start static file server on port 8002 for the frontend
        print("🌐 Starting frontend server on http://localhost:8002")
        frontend_process = subprocess.Popen([
            sys.executable, "-m", "http.server", "8002"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        print("=" * 50)
        print("✅ Servers started successfully!")
        print()
        print("🔗 Frontend: http://localhost:8002")
        print("🔗 Backend API: http://localhost:8001")
        print("📚 API Docs: http://localhost:8001/docs")
        print()
        print("Press Ctrl+C to stop both servers...")
        
        # Wait for user to stop
        try:
            backend_process.wait()
        except KeyboardInterrupt:
            print("\n🛑 Stopping servers...")
            backend_process.terminate()
            frontend_process.terminate()
            print("✅ Servers stopped")
            
    except Exception as e:
        print(f"❌ Error starting servers: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(start_servers())