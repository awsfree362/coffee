# Coffee Platform - API Reference

## 📡 Complete API Documentation

Base URL: `http://localhost:5000/api`

---

## 🔐 Authentication

All protected endpoints require JWT token in header:
```
Authorization: Bearer <token>
```

---

## 👤 AUTH ENDPOINTS

### POST /auth/register
Register a new user

**Body (multipart/form-data):**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "user_type": "escort|visitor|venue",
  "full_name": "string",
  "date_of_birth": "YYYY-MM-DD",
  "phone": "string",
  "address": "string",
  "bio": "string",
  "ethnicity": "string",
  "referral_code": "string (optional)",
  "profile_image": "file (optional)",
  "id_document": "file (optional)"
}
```

**Response:**
```json
{
  "message": "Registration successful",
  "access_token": "string",
  "user_id": 1,
  "affiliate_code": "string"
}
```

---

### POST /auth/login
Login user

**Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "access_token": "string",
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "user_type": "string",
    "profile_image_url": "string",
    "affiliate_code": "string"
  }
}
```

---

### GET /auth/me
Get current user (Protected)

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "user_type": "string",
    "full_name": "string",
    "phone": "string",
    "bio": "string",
    "ethnicity": "string",
    "profile_image_url": "string",
    "affiliate_code": "string"
  }
}
```

---

## 👥 USER ENDPOINTS

### GET /users/profile/:id
Get user profile

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "string",
    "full_name": "string",
    "bio": "string",
    "ethnicity": "string",
    "profile_image_url": "string",
    "user_type": "string",
    "created_at": "datetime",
    "has_active_subscription": true,
    "subscription_end_date": "datetime",
    "post_count": 10
  }
}
```

---

### GET /users/profile/:id/contact
Get user contact info (Protected, Premium)

**Response:**
```json
{
  "contact": {
    "phone": "string",
    "email": "string",
    "address": "string"
  }
}
```

**Error (403):**
```json
{
  "error": "Contact information locked",
  "message": "Upgrade to premium or wait for profile owner to renew subscription"
}
```

---

### PUT /users/profile/update
Update profile (Protected)

**Body (multipart/form-data):**
```json
{
  "full_name": "string",
  "bio": "string",
  "ethnicity": "string",
  "phone": "string",
  "address": "string",
  "profile_image": "file (optional)"
}
```

**Response:**
```json
{
  "message": "Profile updated successfully"
}
```

---

### GET /users/search
Search users

**Query Parameters:**
- `q` - Search query
- `type` - User type (escort|visitor|venue)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)

**Response:**
```json
{
  "users": [...],
  "page": 1
}
```

---

### GET /users/featured
Get featured users

**Query Parameters:**
- `limit` - Number of users (default: 10)
- `type` - User type (default: escort)

**Response:**
```json
{
  "users": [...]
}
```

---

## 📱 POST ENDPOINTS

### POST /posts/create
Create post (Protected, Subscription Required)

**Body (multipart/form-data):**
```json
{
  "caption": "string",
  "media_type": "image|video",
  "media": "file",
  "duration": "number (optional)"
}
```

**Response:**
```json
{
  "message": "Post created",
  "post_id": 1
}
```

---

### GET /posts/feed
Get posts feed

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Posts per page (default: 20)

**Response:**
```json
{
  "posts": [
    {
      "id": 1,
      "user_id": 1,
      "username": "string",
      "profile_image_url": "string",
      "caption": "string",
      "media_type": "string",
      "media_url": "string",
      "likes_count": 10,
      "comments_count": 5,
      "views_count": 100,
      "created_at": "datetime"
    }
  ],
  "page": 1
}
```

---

### GET /posts/:id
Get single post

**Response:**
```json
{
  "post": {...}
}
```

---

### POST /posts/:id/like
Like/unlike post (Protected)

**Response:**
```json
{
  "message": "Post liked|unliked"
}
```

**Error (403):**
```json
{
  "error": "Monthly like limit reached. Upgrade to premium."
}
```

---

### POST /posts/:id/comment
Comment on post (Protected)

**Body:**
```json
{
  "comment_text": "string"
}
```

**Response:**
```json
{
  "message": "Comment added",
  "comment_id": 1
}
```

---

### GET /posts/:id/comments
Get post comments

**Response:**
```json
{
  "comments": [
    {
      "id": 1,
      "user_id": 1,
      "username": "string",
      "profile_image_url": "string",
      "comment_text": "string",
      "created_at": "datetime"
    }
  ]
}
```

---

### GET /posts/user/:userId
Get user's posts

**Response:**
```json
{
  "posts": [...]
}
```

---

## 💬 MESSAGE ENDPOINTS

### GET /messages/conversations
Get all conversations (Protected)

**Response:**
```json
{
  "conversations": [
    {
      "id": 1,
      "other_user_id": 2,
      "username": "string",
      "profile_image_url": "string",
      "last_message": "string",
      "unread_count": 3,
      "last_message_at": "datetime"
    }
  ]
}
```

---

### GET /messages/conversation/:userId
Get or create conversation (Protected)

**Response:**
```json
{
  "conversation": {
    "id": 1,
    "user1_id": 1,
    "user2_id": 2
  },
  "messages": [
    {
      "id": 1,
      "sender_id": 1,
      "username": "string",
      "profile_image_url": "string",
      "message_text": "string",
      "attachment_url": "string",
      "attachment_type": "string",
      "is_read": true,
      "created_at": "datetime"
    }
  ]
}
```

---

### POST /messages/send
Send message (Protected)

**Body (multipart/form-data):**
```json
{
  "conversation_id": "number (optional)",
  "other_user_id": "number (optional)",
  "message_text": "string",
  "attachment": "file (optional)",
  "attachment_type": "image|video|document (optional)"
}
```

**Response:**
```json
{
  "message": "Message sent",
  "message_id": 1
}
```

---

### GET /messages/check-limit
Check message limit (Protected)

**Response:**
```json
{
  "can_message": true,
  "limit": 5,
  "used": 2
}
```

---

## 💳 SUBSCRIPTION ENDPOINTS

### GET /subscriptions/status
Get subscription status (Protected)

**Response:**
```json
{
  "has_active_subscription": true,
  "subscription": {
    "id": 1,
    "user_id": 1,
    "subscription_type": "escort",
    "amount": 49.99,
    "start_date": "datetime",
    "end_date": "datetime",
    "payment_verified": true,
    "is_active": true
  },
  "monthly_fee": 49.99,
  "end_date": "datetime"
}
```

---

### POST /subscriptions/create
Create subscription (Protected)

**Body (multipart/form-data):**
```json
{
  "payment_method": "manual|stripe|payfast|yoco",
  "payment_reference": "string (optional)",
  "payment_proof": "file (for manual)"
}
```

**Response:**
```json
{
  "message": "Subscription created, awaiting verification",
  "subscription_id": 1,
  "payment_reference": "string"
}
```

---

### POST /subscriptions/verify/:id
Verify subscription (Protected, Admin)

**Response:**
```json
{
  "message": "Subscription verified successfully"
}
```

---

### POST /subscriptions/use-affiliate-earnings
Pay subscription with earnings (Protected)

**Response:**
```json
{
  "message": "Subscription activated using affiliate earnings",
  "subscription_id": 1
}
```

---

### GET /subscriptions/my-subscriptions
Get subscription history (Protected)

**Response:**
```json
{
  "subscriptions": [...]
}
```

---

## 💰 AFFILIATE ENDPOINTS

### GET /affiliates/stats
Get affiliate statistics (Protected)

**Response:**
```json
{
  "total_earnings": 500.00,
  "total_referrals": 10,
  "active_referrals": 8,
  "available_balance": 300.00,
  "pending_balance": 200.00
}
```

---

### GET /affiliates/earnings
Get earnings history (Protected)

**Response:**
```json
{
  "earnings": [
    {
      "id": 1,
      "referred_user_id": 2,
      "referred_username": "string",
      "commission_amount": 9.99,
      "commission_percentage": 20.00,
      "status": "pending|paid",
      "earned_at": "datetime"
    }
  ]
}
```

---

### POST /affiliates/request-payout
Request payout (Protected)

**Body:**
```json
{
  "amount": 100.00,
  "bank_name": "string",
  "account_number": "string",
  "account_holder": "string"
}
```

**Response:**
```json
{
  "message": "Payout request submitted",
  "payout_id": 1
}
```

---

### GET /affiliates/validate-code/:code
Validate affiliate code

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "username": "string"
  }
}
```

---

## 🎉 EVENT ENDPOINTS

### POST /events/create
Create event (Protected, Venue Only, Subscription Required)

**Body (multipart/form-data):**
```json
{
  "event_name": "string",
  "event_description": "string",
  "event_date": "datetime",
  "event_location": "string",
  "ticket_price": 100.00,
  "total_tickets": 50,
  "event_image": "file (optional)"
}
```

**Response:**
```json
{
  "message": "Event created",
  "event_id": 1
}
```

---

### GET /events/list
List all events

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Events per page (default: 20)

**Response:**
```json
{
  "events": [
    {
      "id": 1,
      "venue_id": 1,
      "venue_name": "string",
      "venue_image": "string",
      "event_name": "string",
      "event_description": "string",
      "event_date": "datetime",
      "event_location": "string",
      "ticket_price": 100.00,
      "total_tickets": 50,
      "available_tickets": 30,
      "event_image_url": "string",
      "created_at": "datetime"
    }
  ],
  "page": 1
}
```

---

### GET /events/:id
Get event details

**Response:**
```json
{
  "event": {...}
}
```

---

### POST /events/:id/purchase
Purchase ticket (Protected)

**Body (multipart/form-data):**
```json
{
  "event_id": 1,
  "payment_method": "manual|stripe|payfast|yoco",
  "payment_proof": "file (for manual)"
}
```

**Response:**
```json
{
  "message": "Ticket purchased successfully",
  "ticket_id": 1,
  "ticket_code": "string",
  "qr_code_url": "string"
}
```

---

### GET /events/my-tickets
Get user's tickets (Protected)

**Response:**
```json
{
  "tickets": [
    {
      "id": 1,
      "event_id": 1,
      "event_name": "string",
      "event_date": "datetime",
      "event_location": "string",
      "event_image_url": "string",
      "ticket_code": "string",
      "qr_code_url": "string",
      "is_used": false,
      "used_at": null,
      "purchase_date": "datetime"
    }
  ]
}
```

---

### POST /events/verify-ticket
Verify ticket (Protected, Venue Only)

**Body:**
```json
{
  "ticket_code": "string"
}
```

**Response:**
```json
{
  "valid": true,
  "ticket": {
    "id": 1,
    "event_name": "string",
    "attendee_name": "string",
    "ticket_code": "string"
  },
  "message": "Ticket verified successfully"
}
```

**Error (400):**
```json
{
  "valid": false,
  "error": "Ticket already used",
  "used_at": "datetime"
}
```

---

### GET /events/my-events
Get venue's events (Protected, Venue Only)

**Response:**
```json
{
  "events": [
    {
      "id": 1,
      "event_name": "string",
      "event_date": "datetime",
      "total_tickets": 50,
      "available_tickets": 30,
      "tickets_sold": 20,
      "created_at": "datetime"
    }
  ]
}
```

---

## 🔌 SOCKET.IO EVENTS

### Client → Server

**join_conversation**
```json
{
  "conversation_id": 1
}
```

**typing**
```json
{
  "conversation_id": 1,
  "user_id": 1
}
```

### Server → Client

**new_message**
```json
{
  "id": 1,
  "conversation_id": 1,
  "sender_id": 1,
  "message_text": "string",
  "created_at": "datetime"
}
```

**user_typing**
```json
{
  "user_id": 1
}
```

---

## ❌ Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message"
}
```

### Common Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

---

## 📝 Notes

1. All dates are in ISO 8601 format
2. File uploads use `multipart/form-data`
3. JSON requests use `application/json`
4. JWT tokens expire after 24 hours
5. All monetary values are in ZAR (South African Rand)
6. Pagination starts at page 1
7. Default limit is 20 items per page

---

## 🔒 Rate Limiting

**Recommended limits (not yet implemented):**
- Authentication: 5 requests per minute
- API calls: 100 requests per minute
- File uploads: 10 requests per minute

---

## 🚀 Quick Start

```javascript
// Login
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});
const { access_token } = await response.json();

// Get current user
const userResponse = await fetch('http://localhost:5000/api/auth/me', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const { user } = await userResponse.json();
```

---

**API Version:** 1.0  
**Last Updated:** 2024
