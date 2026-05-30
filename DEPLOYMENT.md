# Coffee Platform - Production Deployment Guide

## 🚀 Deployment Options

### Option 1: Railway (Recommended - Your DB is already there!)

#### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
# or
curl -fsSL https://railway.app/install.sh | sh
```

#### Step 2: Login and Initialize
```bash
railway login
cd c:\Users\me\Desktop\coffee
railway init
```

#### Step 3: Link to Project
```bash
railway link
```

#### Step 4: Deploy
```bash
railway up
```

#### Step 5: Set Environment Variables
```bash
railway variables set FLASK_ENV=production
railway variables set SECRET_KEY=your-new-secret-key-here
railway variables set JWT_SECRET_KEY=your-new-jwt-secret-here
```

Your app will be live at: `https://your-app.railway.app`

---

### Option 2: Heroku

#### Step 1: Install Heroku CLI
Download from: https://devcenter.heroku.com/articles/heroku-cli

#### Step 2: Login and Create App
```bash
heroku login
cd c:\Users\me\Desktop\coffee
heroku create coffee-platform
```

#### Step 3: Add Buildpack
```bash
heroku buildpacks:set heroku/python
```

#### Step 4: Set Environment Variables
```bash
heroku config:set FLASK_ENV=production
heroku config:set SECRET_KEY=your-new-secret-key-here
heroku config:set JWT_SECRET_KEY=your-new-jwt-secret-here
heroku config:set MYSQL_HOST=kodama.proxy.rlwy.net
heroku config:set MYSQL_PORT=11496
heroku config:set MYSQL_USER=root
heroku config:set MYSQL_PASSWORD=XyrEPyHQrgZTYSVxKQHccLzHFNeCSKKy
heroku config:set MYSQL_DATABASE=railway
heroku config:set REDIS_URL=redis://default:dfKndyDtpMeqYbgjKsUKvJfGwUxLgUSZ@kodama.proxy.rlwy.net:42365
```

#### Step 5: Deploy
```bash
git init
git add .
git commit -m "Initial commit"
git push heroku main
```

Your app will be live at: `https://coffee-platform.herokuapp.com`

---

### Option 3: DigitalOcean App Platform

#### Step 1: Create Account
Sign up at: https://www.digitalocean.com

#### Step 2: Create New App
1. Click "Create" → "Apps"
2. Connect your GitHub repository
3. Select branch: `main`
4. Detect Python app automatically

#### Step 3: Configure Environment
Add these environment variables:
```
FLASK_ENV=production
SECRET_KEY=your-new-secret-key-here
JWT_SECRET_KEY=your-new-jwt-secret-here
MYSQL_HOST=kodama.proxy.rlwy.net
MYSQL_PORT=11496
MYSQL_USER=root
MYSQL_PASSWORD=XyrEPyHQrgZTYSVxKQHccLzHFNeCSKKy
MYSQL_DATABASE=railway
REDIS_URL=redis://default:dfKndyDtpMeqYbgjKsUKvJfGwUxLgUSZ@kodama.proxy.rlwy.net:42365
```

#### Step 4: Deploy
Click "Deploy" and wait for build to complete.

---

### Option 4: AWS (Advanced)

#### Architecture:
- **EC2**: Application server
- **RDS**: MySQL (or use Railway)
- **ElastiCache**: Redis (or use Railway)
- **S3**: Media storage
- **CloudFront**: CDN
- **Route 53**: DNS
- **Certificate Manager**: SSL

#### Step 1: Launch EC2 Instance
```bash
# Ubuntu 22.04 LTS
# t3.medium or larger
```

#### Step 2: Install Dependencies
```bash
sudo apt update
sudo apt install python3-pip python3-venv nginx -y
```

#### Step 3: Clone and Setup
```bash
cd /var/www
sudo git clone your-repo coffee
cd coffee
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Step 4: Configure Nginx
```nginx
# /etc/nginx/sites-available/coffee
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /static {
        alias /var/www/coffee/static;
    }

    location /uploads {
        alias /var/www/coffee/uploads;
    }
}
```

#### Step 5: Setup Systemd Service
```ini
# /etc/systemd/system/coffee.service
[Unit]
Description=Coffee Platform
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/coffee
Environment="PATH=/var/www/coffee/venv/bin"
ExecStart=/var/www/coffee/venv/bin/gunicorn app:app --worker-class eventlet -w 4 --bind 127.0.0.1:5000

[Install]
WantedBy=multi-user.target
```

#### Step 6: Start Services
```bash
sudo systemctl enable coffee
sudo systemctl start coffee
sudo systemctl enable nginx
sudo systemctl restart nginx
```

#### Step 7: Setup SSL (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---

## 🔒 Production Security Checklist

### 1. Change Secret Keys
```bash
# Generate new keys
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Update in `.env`:
```
SECRET_KEY=your-new-32-char-secret
JWT_SECRET_KEY=your-new-32-char-jwt-secret
```

### 2. Set Production Mode
```
FLASK_ENV=production
```

### 3. Configure CORS
In `app.py`, change:
```python
CORS(app, resources={r"/api/*": {"origins": "https://your-domain.com"}})
```

### 4. Enable HTTPS Only
Add to `app.py`:
```python
from flask_talisman import Talisman
Talisman(app, force_https=True)
```

### 5. Set Up Rate Limiting
```python
from flask_limiter import Limiter
limiter = Limiter(app, key_func=lambda: request.remote_addr)

@app.route('/api/auth/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    # ...
```

### 6. Configure File Upload Limits
```python
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB
```

### 7. Database Connection Security
- Use SSL for MySQL connection
- Whitelist IP addresses
- Use strong passwords
- Regular backups

### 8. Redis Security
- Enable password authentication
- Bind to localhost only
- Use SSL/TLS

---

## 💳 Payment Gateway Setup

### Stripe
1. Sign up: https://stripe.com
2. Get API keys from Dashboard
3. Set webhook URL: `https://your-domain.com/api/payments/stripe/webhook`
4. Update `.env`:
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### PayFast (South Africa)
1. Sign up: https://www.payfast.co.za
2. Get merchant credentials
3. Set webhook URL
4. Update `.env`:
```
PAYFAST_MERCHANT_ID=your_merchant_id
PAYFAST_MERCHANT_KEY=your_merchant_key
PAYFAST_PASSPHRASE=your_passphrase
```

### Yoco (South Africa)
1. Sign up: https://www.yoco.com
2. Get API keys
3. Update `.env`:
```
YOCO_SECRET_KEY=sk_live_...
YOCO_PUBLIC_KEY=pk_live_...
```

---

## 📧 Email Service Setup

### SendGrid
```bash
pip install sendgrid
```

```python
# In utils/email.py
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

def send_ticket_email(to_email, ticket_data):
    message = Mail(
        from_email='noreply@coffee-platform.com',
        to_emails=to_email,
        subject='Your Event Ticket',
        html_content=f'<strong>Ticket Code: {ticket_data["code"]}</strong>'
    )
    sg = SendGridAPIClient(os.getenv('SENDGRID_API_KEY'))
    sg.send(message)
```

---

## 📦 CDN Setup (CloudFlare)

### Step 1: Add Site to CloudFlare
1. Sign up at https://cloudflare.com
2. Add your domain
3. Update nameservers

### Step 2: Configure Caching
- Cache static files (CSS, JS, images)
- Set cache TTL: 1 month
- Enable auto-minify

### Step 3: Enable Security
- SSL/TLS: Full (strict)
- Always Use HTTPS: On
- Automatic HTTPS Rewrites: On
- Bot Fight Mode: On

---

## 🗄️ Database Backup Strategy

### Automated MySQL Backups
```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -h kodama.proxy.rlwy.net -u root -pXyrEPyHQrgZTYSVxKQHccLzHFNeCSKKy --port 11496 railway > backup_$DATE.sql
# Upload to S3 or backup service
```

### Schedule with Cron
```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup.sh
```

---

## 📊 Monitoring Setup

### Sentry (Error Tracking)
```bash
pip install sentry-sdk[flask]
```

```python
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration

sentry_sdk.init(
    dsn="your-sentry-dsn",
    integrations=[FlaskIntegration()],
    traces_sample_rate=1.0
)
```

### New Relic (Performance)
```bash
pip install newrelic
newrelic-admin generate-config YOUR_LICENSE_KEY newrelic.ini
```

Run with:
```bash
NEW_RELIC_CONFIG_FILE=newrelic.ini newrelic-admin run-program gunicorn app:app
```

---

## 🔍 SEO Optimization

### 1. Add Meta Tags
In `templates/index.html`:
```html
<meta name="description" content="Coffee - Premium escort platform">
<meta name="keywords" content="escorts, events, premium">
<meta property="og:title" content="Coffee Platform">
<meta property="og:description" content="Premium escort platform">
<meta property="og:image" content="/static/images/og-image.jpg">
```

### 2. Add Sitemap
Create `static/sitemap.xml`

### 3. Add robots.txt
Create `static/robots.txt`

---

## 📱 Mobile App (Optional)

### Progressive Web App (PWA)
Add `manifest.json`:
```json
{
  "name": "Coffee Platform",
  "short_name": "Coffee",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ec4899",
  "icons": [
    {
      "src": "/static/images/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

---

## 🧪 Testing Before Launch

### 1. Functionality Tests
- [ ] User registration
- [ ] Login/Logout
- [ ] Profile updates
- [ ] Post creation
- [ ] Messaging
- [ ] Payment flow
- [ ] Subscription activation
- [ ] Affiliate system
- [ ] Event ticketing

### 2. Security Tests
- [ ] SQL injection attempts
- [ ] XSS attempts
- [ ] CSRF protection
- [ ] File upload validation
- [ ] Authentication bypass attempts

### 3. Performance Tests
- [ ] Load testing (100+ concurrent users)
- [ ] Database query optimization
- [ ] Image loading speed
- [ ] API response times

### 4. Mobile Tests
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Responsive layouts
- [ ] Touch interactions

---

## 🚀 Launch Checklist

- [ ] Database initialized with schema
- [ ] All environment variables set
- [ ] Secret keys changed
- [ ] HTTPS enabled
- [ ] Payment gateways configured
- [ ] Email service configured
- [ ] Backups scheduled
- [ ] Monitoring enabled
- [ ] Error tracking enabled
- [ ] CDN configured
- [ ] Domain configured
- [ ] SSL certificate installed
- [ ] All features tested
- [ ] Mobile tested
- [ ] Security audit completed
- [ ] Performance optimized
- [ ] Documentation updated
- [ ] Support email configured
- [ ] Terms of service added
- [ ] Privacy policy added
- [ ] Age verification working

---

## 📞 Post-Launch

### Day 1
- Monitor error logs
- Check payment processing
- Verify email delivery
- Monitor server resources

### Week 1
- Analyze user behavior
- Fix any bugs
- Optimize slow queries
- Adjust rate limits

### Month 1
- Review analytics
- Gather user feedback
- Plan new features
- Scale infrastructure if needed

---

## 🆘 Troubleshooting

### High CPU Usage
- Increase worker count
- Enable Redis caching
- Optimize database queries
- Add CDN for static files

### Slow Database
- Add more indexes
- Optimize queries
- Enable query caching
- Consider read replicas

### Out of Memory
- Increase server RAM
- Optimize image processing
- Clear old sessions
- Enable swap space

### Payment Issues
- Check webhook URLs
- Verify API keys
- Check firewall rules
- Review transaction logs

---

## 📈 Scaling Strategy

### Phase 1: Single Server (0-1000 users)
- Current setup sufficient
- Monitor resources

### Phase 2: Load Balancing (1000-10000 users)
- Add load balancer
- Multiple app servers
- Shared Redis
- CDN for media

### Phase 3: Microservices (10000+ users)
- Separate messaging service
- Separate payment service
- Database sharding
- Message queue (RabbitMQ)

---

**Your Coffee platform is ready for production! 🚀☕**

For support: support@coffee-platform.com
