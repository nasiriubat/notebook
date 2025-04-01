#!/bin/bash

# Exit on error
set -e

echo "🔄 Starting application update..."

# Navigate to application directory
# cd /var/www/thinksync

# Pull latest changes
echo "📥 Pulling latest changes from git..."
git pull origin main  # or your main branch name

# Update backend
echo "⚙️ Updating backend..."
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart your-app

# Update frontend
echo "⚙️ Updating frontend..."
cd ../frontend
npm install
npm run build


echo "✅ Update completed successfully!" 