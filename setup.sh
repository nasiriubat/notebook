#!/bin/bash
set -e
echo "🚀 Starting fullstack app setup..."

# Update and install required packages
# sudo apt update && sudo apt upgrade -y
# sudo apt install -y python3 python3-venv python3-pip nginx nodejs npm git

# Install pm2 globally
# sudo npm install -g pm2

# Setup Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
flask db upgrade


# Start Flask app with PM2
pm2 start "python run.py" --name flask-backend

# Setup Frontend
cd ../frontend
npm install
npm run build

# Start frontend with PM2 as a static server
pm2 serve dist 5173 --name vite-frontend

# Save and enable PM2 startup on boot
pm2 save
pm2 startup

echo "✅ Setup complete. Flask running on 5000, Vite build served on 5173."
