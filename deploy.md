# 🚀 Deployment Scripts Guide


## ⚙️ Before Running the Scripts

### 📝 Edit setup.sh

Before running the setup script, you need to modify the following variables:

1. Replace `your-github-repo-url` with your actual GitHub repository URL
2. Replace `your-domain.com` with your actual domain name
3. Replace `your-app-name` with your desired application name
4. Set up your environment variables in `backend/.env`

### 📝 Edit update.sh

Before running the update script:
- Replace `main` with your main branch name if it's different (e.g., `master`)


## 📋 Using the Deployment Scripts

### 🔧 Initial Setup

```bash
# Make the setup script executable
chmod +x setup.sh

# Run the setup script
./setup.sh
```

### 🔄 Future Updates

```bash
# Make the update script executable
chmod +x update.sh

# Run the update script
./update.sh
```


## ⚠️ Important Notes

### Script Features
- Includes error handling (`set -e`) - stops if any command fails
- Uses emojis and clear messages to show progress
- Requires sudo privileges for some operations

### Prerequisites
Before running the scripts, ensure you have:
1. Set up your environment variables in `backend/.env`
2. Configured your domain DNS settings
3. Set up SSL/HTTPS if needed
4. Configured your firewall

## 🔍 Troubleshooting

### Checking Logs

#### Backend Logs
```bash
sudo journalctl -u your-app
```

#### Nginx Logs
```bash
sudo tail -f /var/log/nginx/error.log
```

### Verifying Permissions
```bash
sudo chown -R $USER:$USER /var/www/your-app-name
```

### Checking Service Status
```bash
# Check backend service
sudo systemctl status your-app

# Check Nginx service
sudo systemctl status nginx

```

### if you face issues with running flask fb migrate command in server then follow
```bash
# Create a 1GB swap file
sudo fallocate -l 1G /swapfile

# Secure the file
sudo chmod 600 /swapfile

# Set it as swap
sudo mkswap /swapfile

# Enable it
sudo swapon /swapfile

# Make it permanent (so it survives reboots)
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Then try again

## 📝 Best Practices

1. Always backup your data before running scripts
2. Test the scripts in a staging environment first
3. Keep your system and packages updated
4. Monitor logs regularly for any issues
5. Follow security best practices

## 🔒 Security Considerations

1. Ensure proper file permissions
2. Use secure environment variables
3. Configure firewall rules appropriately
4. Keep SSL certificates up to date
5. Regular security audits


