#!/usr/bin/env python3
"""
Neuron - AI Autonomous Driving Lab Launcher
Quickly launch the Flask app and automatically open your default browser.
"""

import sys
import webbrowser
import threading
import time

try:
    import flask
except ImportError:
    print("\n[!] Flask is required to run this application.")
    print("    Please install it by running:")
    print("    pip install -r requirements.txt\n")
    sys.exit(1)

from app import app

def open_browser(port):
    time.sleep(1.2)
    url = f"http://127.0.0.1:{port}"
    print(f"[*] Opening browser at {url}...")
    webbrowser.open(url)

if __name__ == '__main__':
    port = 5000
    banner = r"""
  _   _ ______ _    _ _____   ____  _   _ 
 | \ | |  ____| |  | |  __ \ / __ \| \ | |
 |  \| | |__  | |  | | |__) | |  | |  \| |
 | . ` |  __| | |  | |  _  /| |  | | . ` |
 | |\  | |____| |__| | | \ \| |__| | |\  |
 |_| \_|______|\____/|_|  \_\\____/|_| \_|
   Autonomous Neural Genetic AI Simulator
    """
    print(banner)
    print("=" * 55)
    print("  Status: Server launching...")
    print(f"  Access: http://127.0.0.1:{port}")
    print("  Press Ctrl+C to stop the server")
    print("=" * 55 + "\n")

    threading.Thread(target=open_browser, args=(port,), daemon=True).start()
    app.run(host='127.0.0.1', port=port, debug=False)
