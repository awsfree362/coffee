#!/bin/bash

# Coffee Platform - Production Deployment Script
# This script automates the entire deployment process

set -e

echo "=========================================="
echo "   COFFEE PLATFORM - PRODUCTION DEPLOY"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}Please do not run as root${NC}"
    exit 1
fi

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker not found. Installing...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose not found. Installing...${NC}"
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

echo -e "${GREEN}✓ Prerequisites checked${NC}"
echo ""

# Generate secrets
echo -e "${YELLOW}Generating secure secrets...${NC}"

SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
MYSQL_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(16))")
MYSQL_ROOT_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(16))")
REDIS_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(16))")

echo -e "${GREEN}✓ Secrets generated${NC}"
echo ""

# Create .env.production
echo -e "${YELLOW}Creating production environment file...${NC}"

cat > .env.production << EOF
# Coffee Platform - Production Configuration
# Generated: $(date)

# Application
FLASK_ENV=production
SECRET_KEY=${SECRET_KEY}
JWT_SECRET_KEY=${JWT_SECRET_KEY}
APP_URL=https://your-domain.com

# Database
MYSQL_HOST=db
MYSQL_PORT=3306
MYSQL_USER=coffee_user
MYSQL_PASSWORD=${MYSQL_PASSWORD}
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
MYSQL_DATABASE=coffee_db

# Redis
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
REDIS_PASSWORD=${REDIS_PASSWORD}

# Upload Configuration
MAX_CONTENT_LENGTH=52428800
UPLOAD_FOLDER=uploads

# Payment Gateways (Configure these)
STRIPE_SECRET_KEY=sk_live_your_key_here
STRIPE_PUBLIC_KEY=pk_live_your_key_here
PAYFAST_MERCHANT_ID=your_merchant_id
PAYFAST_MERCHANT_KEY=your_merchant_key
YOCO_SECRET_KEY=your_yoco_key

# Email Service (SendGrid)
SENDGRID_API_KEY=your_sendgrid_key

# SMS Service (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number

# Monitoring (Optional)
SENTRY_DSN=your_sentry_dsn
EOF

echo -e "${GREEN}✓ Environment file created${NC}"
echo ""

# Create necessary directories
echo -e "${YELLOW}Creating directories...${NC}"

mkdir -p uploads/{profiles,posts,messages,events,payments,qrcodes}
mkdir -p logs
mkdir -p ssl

echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Initialize database
echo -e "${YELLOW}Initializing database...${NC}"

# Start database container first
docker-compose up -d db redis

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 10

# Run database migrations
docker-compose exec -T db mysql -u root -p${MYSQL_ROOT_PASSWORD} coffee_db < database_schema.sql
docker-compose exec -T db mysql -u root -p${MYSQL_ROOT_PASSWORD} coffee_db < database_schema_advanced.sql

echo -e "${GREEN}✓ Database initialized${NC}"
echo ""

# Build and start all services
echo -e "${YELLOW}Building and starting services...${NC}"

docker-compose up -d --build

echo -e "${GREEN}✓ Services started${NC}"
echo ""

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 15

# Check service status
echo -e "${YELLOW}Checking service status...${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}=========================================="
echo "   DEPLOYMENT COMPLETE! 🎉"
echo "==========================================${NC}"
echo ""
echo "Your Coffee Platform is now running!"
echo ""
echo "📊 Service URLs:"
echo "   - Application: http://localhost"
echo "   - Admin Panel: http://localhost/admin"
echo "   - API Docs: http://localhost/api"
echo ""
echo "🔐 Important Information:"
echo "   - SECRET_KEY: ${SECRET_KEY}"
echo "   - JWT_SECRET_KEY: ${JWT_SECRET_KEY}"
echo "   - MySQL Password: ${MYSQL_PASSWORD}"
echo "   - Redis Password: ${REDIS_PASSWORD}"
echo ""
echo "⚠️  SAVE THESE CREDENTIALS SECURELY!"
echo ""
echo "📝 Next Steps:"
echo "   1. Configure payment gateways in .env.production"
echo "   2. Set up SSL certificate (certbot --nginx)"
echo "   3. Configure your domain DNS"
echo "   4. Test all features"
echo "   5. Launch! 🚀"
echo ""
echo "📚 Documentation:"
echo "   - PRODUCTION_GUIDE.md"
echo "   - ENTERPRISE_OVERVIEW.md"
echo "   - DEPLOYMENT.md"
echo ""
echo "🆘 Support:"
echo "   - Check logs: docker-compose logs -f"
echo "   - Restart: docker-compose restart"
echo "   - Stop: docker-compose down"
echo ""
echo -e "${GREEN}Happy launching! ☕${NC}"
