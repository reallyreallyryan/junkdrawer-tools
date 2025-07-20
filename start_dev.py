#!/usr/bin/env python3
"""
Unified development server for JunkDrawer.Tools
Starts both the main website and the LLMS converter backend
"""

import subprocess
import sys
import time
import os
import signal
from pathlib import Path

def start_servers():
    """Start both main website and backend servers"""
    
    # Change to the project root directory
    project_root = Path(__file__).parent
    os.chdir(project_root)
    
    print("🚀 Starting JunkDrawer.Tools Development Environment...")
    print("=" * 60)
    
    processes = []
    
    try:
        # Start main website server on port 8080
        print("🌐 Starting main website server on http://localhost:8080")
        main_process = subprocess.Popen([
            sys.executable, "-m", "http.server", "8080"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        processes.append(("Main Website", main_process))
        
        # Wait a moment
        time.sleep(1)
        
        # Start LLMS converter backend on port 8001
        print("📡 Starting LLMS converter backend on http://localhost:8001")
        llms_dir = project_root / "tools" / "llms-converter"
        backend_process = subprocess.Popen([
            sys.executable, "app.py"
        ], cwd=llms_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        processes.append(("LLMS Backend", backend_process))
        
        # Wait a moment for backend to start
        time.sleep(2)
        
        print("=" * 60)
        print("✅ All servers started successfully!")
        print()
        print("🔗 Main Website: http://localhost:8080")
        print("📷 Alt Text Generator: http://localhost:8080/tools/alt-text-generator/")
        print("🧠 LLMS Converter: http://localhost:8080/tools/llms-converter/")
        print("📡 LLMS Backend API: http://localhost:8001")
        print("📚 API Documentation: http://localhost:8001/docs")
        print()
        print("Press Ctrl+C to stop all servers...")
        
        # Set up signal handler for clean shutdown
        def signal_handler(sig, frame):
            print("\n🛑 Stopping all servers...")
            for name, process in processes:
                try:
                    process.terminate()
                    print(f"   ✅ Stopped {name}")
                except:
                    pass
            print("✅ All servers stopped")
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        
        # Wait for processes
        while True:
            time.sleep(1)
            # Check if any process died
            for name, process in processes:
                if process.poll() is not None:
                    print(f"❌ {name} server stopped unexpectedly")
                    return 1
            
    except Exception as e:
        print(f"❌ Error starting servers: {e}")
        # Clean up any started processes
        for name, process in processes:
            try:
                process.terminate()
            except:
                pass
        return 1
    
    return 0

if __name__ == "__main__":
    exit(start_servers())