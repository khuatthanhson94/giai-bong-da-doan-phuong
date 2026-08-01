# Auto Deploy Script for Oracle VPS
param (
    [string]$IP = "140.245.104.29",
    [string]$KeyPath = "$env:USERPROFILE\.ssh\oracle_vps.key"
)

Write-Host "🚀 Connecting to Oracle VPS ($IP) and setting up backend..." -ForegroundColor Green

$remoteScript = @"
sudo iptables -F
sudo netfilter-persistent save
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git build-essential
sudo npm install -g pm2
mkdir -p ~/apps && cd ~/apps
rm -rf giai-bong-da-doan-phuong
git clone https://github.com/khuatthanhson94/giai-bong-da-doan-phuong.git
cd giai-bong-da-doan-phuong/backend
npm install
cat << 'EOF' > .env
PORT=5000
JWT_SECRET=bi_mat_bong_da_doan_phuong_2026
NODE_ENV=production
EOF
pm2 stop bongda-backend 2>/dev/null || true
pm2 delete bongda-backend 2>/dev/null || true
pm2 start src/index.js --name "bongda-backend"
pm2 save
echo "✅ HOAN TAT CAI DAT BACKEND TRÊN ORACLE VPS 24/7!"
"@

ssh -o StrictHostKeyChecking=no -i "$KeyPath" "ubuntu@$IP" "$remoteScript"

Write-Host "🎉 Backend running at: http://$($IP):5000/api" -ForegroundColor Cyan
