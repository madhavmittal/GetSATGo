#!/bin/bash
# GetSATGo Development Launch Script

echo "Starting GetSATGo Backend (FastAPI on http://127.0.0.1:8000)..."
source venv/bin/activate
PYTHONPATH=backend python3 -m uvicorn app.main:app --port 8000 &
BACKEND_PID=$!

echo "Starting GetSATGo Frontend (Vite on http://localhost:5173)..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo "GetSATGo is running!"
echo "Frontend: http://localhost:5173"
echo "Backend Docs: http://127.0.0.1:8000/docs"
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID" SIGINT SIGTERM
wait

