#!/bin/bash
set -e
echo "🔄 Updating application..."

# Pull latest code
git pull origin main

# Backend update
cd backend
source venv/bin/activate
pip install -r requirements.txt
pm2 restart flask-backend

# Frontend update
cd ../frontend
npm install
npm run build
pm2 restart vite-frontend

echo "✅ App updated and restarted!"
