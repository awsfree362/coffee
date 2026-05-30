# Coffee Platform - Project Structure

```
coffee/
│
├── app.py                          # Main Flask application entry point
├── requirements.txt                # Python dependencies
├── .env                           # Environment variables (DATABASE, REDIS, SECRETS)
├── .gitignore                     # Git ignore rules
├── Procfile                       # Deployment configuration
├── start.bat                      # Windows startup script
├── README.md                      # Full documentation
├── QUICKSTART.md                  # Quick start guide
├── database_schema.sql            # Complete database schema
│
├── database/                      # Database connection layer
│   ├── __init__.py
│   └── db.py                     # MySQL & Redis connection pooling
│
├── utils/                         # Utility functions
│   ├── __init__.py
│   └── helpers.py                # File uploads, password hashing, QR codes
│
├── routes/                        # API route blueprints
│   ├── __init__.py               # Main routes (serve HTML)
│   ├── auth.py                   # Authentication (login, register)
│   ├── users.py                  # User profiles & search
│   ├── posts.py                  # TikTok-style posts feed
│   ├── messages.py               # WhatsApp-style messaging
│   ├── subscriptions.py          # Subscription management
│   ├── affiliates.py             # Affiliate system
│   ├── events.py                 # Event ticketing
│   └── payments.py               # Payment processing
│
├── templates/                     # HTML templates
│   └── index.html                # Main SPA template
│
├── static/                        # Static assets
│   ├── css/
│   │   └── styles.css            # Custom styles & animations
│   └── js/
│       ├── app.js                # Main app logic & navigation
│       ├── auth.js               # Authentication & profiles
│       ├── posts.js              # Posts feed & interactions
│       └── messages.js           # Real-time messaging
│
└── uploads/                       # User-generated content
    ├── profiles/                 # Profile images & ID documents
    ├── posts/                    # Post images & videos
    ├── messages/                 # Message attachments
    ├── events/                   # Event images
    ├── payments/                 # Payment proof uploads
    └── qrcodes/                  # Generated QR codes

```

## 📁 File Descriptions

### Core Application Files

#### `app.py`
- Flask application initialization
- CORS configuration
- JWT setup
- Socket.IO for real-time messaging
- Blueprint registration
- Upload folder configuration

#### `requirements.txt`
- Flask & extensions
- Database drivers (MySQL, Redis)
- Image processing (Pillow)
- Payment SDKs (Stripe)
- QR code generation
- WebSocket support

#### `.env`
- Database credentials (Railway MySQL & Redis)
- Secret keys (JWT, Flask)
- Payment gateway keys
- Upload configuration
- Application URL

### Database Layer

#### `database/db.py`
- MySQL connection pooling (10 connections)
- Redis client initialization
- Query execution helpers
- Cache management functions

#### `database_schema.sql`
- 15+ tables for complete functionality
- Indexes for performance
- Foreign key relationships
- Default system settings

### Utilities

#### `utils/helpers.py`
- File upload handling (images, videos, documents)
- Image optimization & resizing
- Password hashing (bcrypt)
- Affiliate code generation
- QR code creation
- Age calculation
- Date utilities

### API Routes

#### `routes/auth.py`
- POST /api/auth/register - User registration with file uploads
- POST /api/auth/login - JWT token authentication
- GET /api/auth/me - Current user info
- POST /api/auth/verify-age - Age verification

#### `routes/users.py`
- GET /api/users/profile/:id - Public profile view
- GET /api/users/profile/:id/contact - Contact info (premium)
- PUT /api/users/profile/update - Update own profile
- GET /api/users/search - Search users by name/bio
- GET /api/users/featured - Featured profiles

#### `routes/posts.py`
- POST /api/posts/create - Create post (subscription required)
- GET /api/posts/feed - TikTok-style feed
- GET /api/posts/:id - Single post view
- POST /api/posts/:id/like - Like/unlike with limits
- POST /api/posts/:id/comment - Comment with limits
- GET /api/posts/:id/comments - Get all comments
- GET /api/posts/user/:id - User's posts

#### `routes/messages.py`
- GET /api/messages/conversations - All conversations
- GET /api/messages/conversation/:userId - Get/create chat
- POST /api/messages/send - Send message with attachments
- Socket.IO events: join_conversation, typing, new_message

#### `routes/subscriptions.py`
- GET /api/subscriptions/status - Check subscription
- POST /api/subscriptions/create - Create subscription
- POST /api/subscriptions/verify/:id - Verify payment
- POST /api/subscriptions/use-affiliate-earnings - Pay with earnings
- GET /api/subscriptions/my-subscriptions - History

#### `routes/affiliates.py`
- GET /api/affiliates/stats - Dashboard stats
- GET /api/affiliates/earnings - Earnings history
- POST /api/affiliates/request-payout - Request withdrawal
- GET /api/affiliates/validate-code/:code - Validate code

#### `routes/events.py`
- POST /api/events/create - Create event (venues)
- GET /api/events/list - All upcoming events
- GET /api/events/:id - Event details
- POST /api/events/:id/purchase - Buy ticket
- GET /api/events/my-tickets - User's tickets
- POST /api/events/verify-ticket - Scan QR code
- GET /api/events/my-events - Venue's events

#### `routes/payments.py`
- GET /api/payments/methods - Available payment methods
- POST /api/payments/stripe/create-intent - Stripe payment
- POST /api/payments/stripe/webhook - Stripe webhook
- GET /api/payments/transactions - Payment history
- GET /api/payments/bank-details - Bank transfer info

### Frontend

#### `templates/index.html`
- Single Page Application (SPA)
- Age verification modal
- Authentication modal
- Mobile bottom navigation
- Responsive header
- Dynamic content area

#### `static/css/styles.css`
- Modern gradient design (pink to purple)
- Card hover effects
- TikTok-style post container
- WhatsApp-style message bubbles
- Smooth animations
- Mobile responsive
- Custom scrollbar

#### `static/js/app.js`
- Page routing & navigation
- API request helper
- Home page with featured profiles
- Search functionality
- Events listing
- Toast notifications
- Profile viewing

#### `static/js/auth.js`
- Login/Register forms
- JWT token management
- Profile page
- Subscription status
- Affiliate stats
- Logout functionality

#### `static/js/posts.js`
- TikTok-style vertical feed
- Video auto-play on scroll
- Like/comment interactions
- Create post modal
- Media preview
- Engagement tracking

#### `static/js/messages.js`
- WhatsApp-style inbox
- Real-time messaging (Socket.IO)
- Conversation list
- Message bubbles
- File attachments
- Typing indicators
- Contact viewing

## 🔄 Data Flow

### User Registration Flow
1. User fills registration form → `auth.js`
2. FormData with files → `POST /api/auth/register`
3. `routes/auth.py` validates age, checks duplicates
4. `utils/helpers.py` saves profile image & ID
5. Password hashed with bcrypt
6. User inserted into database
7. Affiliate code generated
8. JWT token returned
9. User redirected to profile

### Post Creation Flow
1. User uploads media → `posts.js`
2. Check subscription status
3. FormData → `POST /api/posts/create`
4. `routes/posts.py` validates subscription
5. `utils/helpers.py` optimizes & saves media
6. Post inserted into database
7. Post appears in feed

### Messaging Flow
1. User opens conversation → `messages.js`
2. Socket.IO connection established
3. Join conversation room
4. Load message history
5. Real-time updates via Socket.IO
6. Attachments saved to uploads/messages/
7. Message limits checked for free users

### Subscription Flow
1. User uploads payment proof → `subscriptions.js`
2. `POST /api/subscriptions/create`
3. Payment proof saved
4. Subscription created (pending)
5. Admin/OCR verifies payment
6. `POST /api/subscriptions/verify/:id`
7. Subscription activated
8. Affiliate commission calculated
9. Features unlocked

### Affiliate Flow
1. User shares affiliate code
2. New user registers with code
3. Referrer ID stored in database
4. New user subscribes
5. 20% commission calculated
6. Added to affiliate_earnings
7. Available for payout at R100+
8. Can be used for own subscription

## 🔐 Security Layers

1. **Authentication**: JWT tokens with expiry
2. **Authorization**: Role-based access control
3. **Password Security**: Bcrypt hashing with salt
4. **SQL Injection**: Parameterized queries
5. **File Upload**: Type & size validation
6. **Age Verification**: Required before access
7. **Payment Verification**: Manual approval
8. **Rate Limiting**: Interaction limits for free users

## 📊 Database Relationships

```
users (1) ─────< (N) posts
users (1) ─────< (N) subscriptions
users (1) ─────< (N) affiliate_earnings (as affiliate)
users (1) ─────< (N) affiliate_earnings (as referred)
users (1) ─────< (N) messages
users (1) ─────< (N) event_tickets
users (1) ─────< (N) events (venues only)
posts (1) ─────< (N) post_likes
posts (1) ─────< (N) post_comments
conversations (1) ─────< (N) messages
events (1) ─────< (N) event_tickets
```

## 🚀 Performance Features

1. **Connection Pooling**: 10 MySQL connections
2. **Redis Caching**: Session & data caching
3. **Image Optimization**: Automatic resizing
4. **Lazy Loading**: Posts load on scroll
5. **Database Indexes**: Optimized queries
6. **CDN Ready**: Static files can be served via CDN
7. **Async Operations**: Socket.IO for real-time

## 📱 Mobile Features

1. **Bottom Navigation**: 4 main buttons
2. **Touch Gestures**: Swipe for posts
3. **Responsive Design**: Mobile-first approach
4. **PWA Ready**: Can be installed
5. **Optimized Images**: Smaller sizes for mobile
6. **Touch-friendly**: Large tap targets

## 🎨 Customization Points

1. **Colors**: `static/css/styles.css` - Gradient colors
2. **Pricing**: `system_settings` table in database
3. **Limits**: `system_settings` table
4. **Site Name**: `templates/index.html` & database
5. **Logo**: Replace ☕ emoji in header
6. **Payment Methods**: Enable/disable in `.env`

## 🔧 Configuration

All dynamic settings in `system_settings` table:
- Pricing for all user types
- Affiliate commission rate
- Free tier limits
- Minimum payout amount
- Site metadata

## 📈 Scalability

- **Horizontal Scaling**: Add more app servers
- **Database**: MySQL replication
- **Caching**: Redis cluster
- **Media Storage**: Move to S3/CDN
- **Load Balancing**: Nginx/HAProxy
- **Monitoring**: Sentry, New Relic

---

**This structure ensures maintainability, scalability, and security for the Coffee platform.**
