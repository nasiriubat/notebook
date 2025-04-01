#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting application setup..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required system packages
echo "📦 Installing required system packages..."
sudo apt install -y python3 python3-pip python3-venv nginx git nodejs npm

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/thinksync
sudo chown -R $USER:$USER /var/www/thinksync

# Clone repository (replace with your repository URL)
echo "📥 Cloning repository..."
cd /var/www/thinksync
git clone https://github.com/nasiriubat/notebook.git .

# Setup backend
echo "⚙️ Setting up backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create systemd service file
echo "⚙️ Creating systemd service..."
sudo tee /etc/systemd/system/thinksync.service << EOF
[Unit]
Description=Your Flask Application
After=network.target

[Service]
User=$USER
WorkingDirectory=/var/www/thinksync/backend
Environment="PATH=/var/www/thinksync/backend/venv/bin"
ExecStart=/var/www/thinksync/backend/venv/bin/python run.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start backend service
echo "🚀 Starting backend service..."
sudo systemctl daemon-reload
sudo systemctl start your-app
sudo systemctl enable your-app

# Setup frontend
echo "⚙️ Setting up frontend..."
cd ../frontend
npm install
npm run build

# Create Nginx configuration
echo "⚙️ Configuring Nginx..."
sudo tee /etc/nginx/sites-available/your-app << EOF
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/thinksync/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable Nginx site
echo "⚙️ Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/your-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo "✅ Setup completed successfully!"
echo "📝 Please make sure to:"
echo "1. Update the repository URL in this script"
echo "2. Update the domain name in the Nginx configuration"
echo "3. Set up your environment variables in backend/.env"
echo "4. Configure your firewall if needed" 