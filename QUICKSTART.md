# Coffee Platform - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Setup
```bash
setup.bat
```
This will:
- Create virtual environment
- Install all dependencies
- Create upload directories
- Initialize database

### Step 2: Configure (Optional)
Edit `.env` file to add your payment gateway keys:
- Stripe keys
- PayFast credentials
- Yoco keys

### Step 3: Run
```bash
run.bat
```
Open browser: http://localhost:5000

## 🧪 Test Connection
```bash
python test_connection.py
```

## 📁 Project Structure
```
coffee/
├── app.py              # Main Flask application
├── database/           # Database connection & queries
├── routes/             # API endpoints (13 modules)
├── static/             # CSS & JavaScript
├── templates/          # HTML templates
├── uploads/            # User uploaded files
└── utils/              # Helper functions
```

## 🔑 Default Features
- User registration (Escort, Visitor, Venue)
- Age verification (18+)
- Affiliate system (20% commission)
- TikTok-style posts feed
- WhatsApp-style messaging
- Event ticketing with QR codes
- Payment processing
- Subscription management

## 📊 Database Tables
33 tables including:
- users
- subscriptions
- affiliate_earnings
- posts, post_likes, post_comments
- messages, conversations
- events, event_tickets
- payment_transactions
- system_settings

## 🔧 Troubleshooting

### Database Connection Failed
1. Check Railway database is running
2. Verify credentials in `.env`
3. Test: `python test_connection.py`

### Port 5000 Already in Use
```bash
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Module Import Errors
```bash
pip install -r requirements.txt
```

## 📞 Support
Check the main README.md for detailed documentation.
