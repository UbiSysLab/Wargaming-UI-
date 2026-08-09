#!/bin/bash
echo "==================================================="
echo "  Starting Wargaming UI Server via Python Flask (Linux)"
echo "==================================================="

# Resolve script directory and root directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Root dir is parent of script directory
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Check virtual environment
if [ ! -d "$ROOT_DIR/.venv" ]; then
    echo "[ERROR] Virtual environment not found at $ROOT_DIR/.venv"
    echo "Please run setup_env.sh in the root directory first."
    exit 1
fi

# Activate virtual environment
echo "[INFO] Activating virtual environment..."
source "$ROOT_DIR/.venv/bin/activate"

# Run Flask UI Server
echo "[INFO] Starting Flask UI server..."
python server.py
