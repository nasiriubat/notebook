#!/bin/bash
set -e
echo "🔄 Updating application..."

# Pull latest code
git reset --hard HEAD
git pull origin main


# Backend update
cd backend
# source venv/bin/activate
# pip install -r requirements.txt
# flask db upgrade
pm2 restart flask-backend

# Frontend update
cd ../frontend
# rm -rf node_modules
# rm -rf package-lock.json
# npm install
npm run build
pm2 restart vite-frontend

echo "✅ App updated and restarted!"
