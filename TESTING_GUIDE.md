# Coffee Platform - Testing Guide

## 🧪 Complete Feature Testing Checklist

This guide will help you test every feature of the Coffee platform systematically.

---

## 🚀 Pre-Testing Setup

### 1. Start the Server
```cmd
cd c:\Users\me\Desktop\coffee
start.bat
```

### 2. Open Browser
Navigate to: **http://localhost:5000**

---

## ✅ Test 1: Age Verification

**Expected Behavior:**
- Modal appears on first visit
- "I'm 18+" button allows entry
- "Exit" button redirects away

**Steps:**
1. Open site in incognito/private mode
2. Click "I'm 18+"
3. Modal should close
4. Refresh page - modal should NOT appear again

**Status:** [ ] Pass [ ] Fail

---

## ✅ Test 2: User Registration

### Test 2A: Register as Escort

**Steps:**
1. Click "Sign In" button
2. Click "Register" tab
3. Fill in form:
   - Username: `escort_test1`
   - Email: `escort1@test.com`
   - Password: `Test123!`
   - User Type: `Escort`
   - Full Name: `Test Escort`
   - Date of Birth: (18+ years ago)
   - Phone: `0821234567`
   - Bio: `Test bio`
   - Ethnicity: `Mixed`
4. Upload profile image (optional)
5. Upload ID document (optional)
6. Click "Register"

**Expected Result:**
- Success message appears
- Automatically logged in
- Redirected to home page
- Profile button visible in header

**Status:** [ ] Pass [ ] Fail

### Test 2B: Register as Visitor

**Steps:**
1. Logout (if logged in)
2. Register with:
   - Username: `visitor_test1`
   - Email: `visitor1@test.com`
   - User Type: `Visitor`
   - (Other fields same as above)

**Status:** [ ] Pass [ ] Fail

### Test 2C: Register as Venue

**Steps:**
1. Logout (if logged in)
2. Register with:
   - Username: `venue_test1`
   - Email: `venue1@test.com`
   - User Type: `Venue`
   - (Other fields same as above)

**Status:** [ ] Pass [ ] Fail

---

## ✅ Test 3: Login

**Steps:**
1. Logout
2. Click "Sign In"
3. Enter email and password
4. Click "Login"

**Expected Result:**
- Success message
- Logged in
- Profile button visible

**Status:** [ ] Pass [ ] Fail

---

## ✅ Test 4: Profile Management

### Test 4A: View Profile

**Steps:**
1. Login as escort
2. Click profile image in header
3. Verify profile page shows:
   - Username
   - Email
   - User type badge
   - Subscription button
   - Affiliates button
   - My Tickets button
   - Create Post button (for escorts/venues)

**Status:** [ ] Pass [ ] Fail

### Test 4B: Edit Profile

**Steps:**
1. On profile page, click "Edit Profile"
2. Update:
   - Full Name
   - Bio
   - Ethnicity
   - Phone
   - Profile Image (optional)
3. Click "Save Changes"

**Expected Result:**
- Success message
- Profile updated
- Changes visible on profile page

**Status:** [ ] Pass [ ] Fail

---

## ✅ Test 5: Subscription System

### Test 5A: Check Subscription Status

**Steps:**
1. Login as escort (without subscription)
2. Click "Subscription" button on profile
3. Verify shows:
   - "Subscription Required" message
   - Monthly fee: R49.99
   - Payment method options

**Status:** [ ] Pass [ ] Fail

### Test 5B: Create Subscription (Manual Payment)

**Steps:**
1. Click "Bank Transfer" payment method
2. Note the bank details and reference code
3. Upload a test image as proof of payment
4. Click "Submit Payment"

**Expected Result:**
- Success message
- "Payment submitted! We will verify..."
- Subscription status shows "Pending"

**Status:** [ ] Pass [ ] Fail

### Test 5C: Verify Subscription (Admin)

**Note:** This requires admin access or direct database update

**SQL Command:**
```sql
UPDATE subscriptions 
SET payment_verified = TRUE, is_active = TRUE 
WHERE user_id = (SELECT id FROM users WHERE email = 'escort1@test.com')
ORDER BY created_at DESC LIMIT 1;
```

**Status:** [ ] Pass [ ] Fail

---

## ✅ Test 6: Posts System

### Test 6A: Create Post (Escort with Subscription)

**Steps:**
1. Login as escort with active subscription
2. Go to profile page
3. Click "Create Post"
4. Select media type: Image or Video
5. Upload media file
6. Enter caption
7. Click "Post"

**Expected Result:**
- Success message
- Post appears on profile
- Post visible in feed

**Status:** [ ] Pass [ ] Fail

### Test 6B: View Posts Feed

**Steps:**
1. Click "Posts" in bottom navigation (mobile) or menu
2. Scroll through posts
3. Verify:
   - Posts load
   - Images/videos display
   - Like count visible
   - Comment count visible

**Status:** [ ] Pass [ ] Fail

### Test 6C: Like Post (Free Visitor)

**Steps:**
1. Login as visitor WITHOUT subscription
2. View posts feed
3. Click heart icon on 10 different posts
4. Try to like 11th post

**Expected Result:**
- First 10 likes work
- 11th like shows error: "Monthly like limit reached"

**Status:** [ ] Pass [ ] Fail

### Test 6D: Comment on Post (Free Visitor)

**Steps:**
1. As free visitor
2. Click on a post
3. Add 10 comments
4. Try to add 11th comment

**Expected Result:**
- First 10 comments work
- 11th comment shows error: "Monthly comment limit reached"

**Status:** [ ] Pass [ ] Fail

### Test 6E: Unlimited Interactions (Premium Visitor)

**Steps:**
1. Login as visitor WITH subscription
2. Like and comment on multiple posts
3. No limits should apply

**Status:** [ ] Pass [ ] Fail

---

## ✅ Test 7: Messaging System

### Test 7A: Send Message (Free Visitor)

**Steps:**
1. Login as free visitor
2. View an escort profile
3. Click "Message" button
4. Send message to 5 different escorts
5. Try to message 6th escort

**Expected Result:**
- First 5 conversations work
- 6th attempt shows error: "Message limit reached"

**Status:** [ ] Pass [ ] Fail

### Test 7B: Send Message (Premium User)

**Steps:**
1. Login as premium visitor or escort
2. Message multiple users
3. No limits should apply

**Status:** [ ] Pass [ ] Fail

### Test 7C: Real-time Messaging

**Steps:**
1. Open two browser windows
2. Login as different users in each
3. Start conversation
4. Send messages from both sides
5. Verify messages appear instantly

**Status:** [ ] Pass [ ] Fail

### Test 7D: File Attachments

**Steps:**
1. In a conversation
2. Click attachment button
3. Upload image/video/document
4. Send message
5. Verify file appears in chat

**Status:** [ ] Pass [ ] Fail

---

## ✅ Test 8: Affiliate System

### Test 8A: Get Affiliate Code

**Steps:**
1. Login as any user
2. Go to profile
3. Click "Affiliates" button
4. Verify:
   - Unique affiliate code displayed
   - Copy button works
   - Share button works

**Status:** [ ] Pass [ ] Fail

### Test 8B: Register with Referral Code

**Steps:**
1. Logout
2. Copy affiliate code from Test 8A
3. Register new user
4. In registration form, enter referral code
5. Complete registration

**Expected Result:**
- Registration successful
- Referrer's affiliate stats updated

**Status:** [ ] Pass [ ] Fail

### Test 8C: Earn Commission

**Steps:**
1. Referred user (from Test 8B) subscribes
2. Admin verifies subscription
3. Check referrer's affiliate page
4. Verify:
   - Total earnings increased by 20% of subscription fee
   - Referral count increased
   - Earnings history shows new entry

**Status:** [ ] Pass [ ] Fail

### Test 8D: Request Payout

**Steps:**
1. Login as user with R100+ earnings
2. Go to Affiliates page
3. Click "Request Payout"
4. Fill in bank details
5. Submit request

**Expected Result:**
- Success message
- Payout request created
- Available balance reduced

**Status:** [ ] Pass [ ] Fail

### Test 8E: Pay Subscription with Earnings

**Steps:**
1. Login as user with sufficient earnings
2. Go to Affiliates page
3. Click "Pay Subscription"
4. Confirm payment

**Expected Result:**
- Subscription activated
- Earnings deducted
- Subscription status updated

**Status:** [ ] Pass [ ] Fail

---

## ✅ Test 9: Events System

### Test 9A: Create Event (Venue)

**Steps:**
1. Login as venue with active subscription
2. Go to profile
3. Click "Create Event"
4. Fill in:
   - Event Name: `Test Party`
   - Description: `Amazing party`
   - Date: (Future date)
   - Location: `Johannesburg`
   - Ticket Price: `100`
   - Total Tickets: `50`
5. Upload event image (optional)
6. Click "Create Event"

**Expected Result:**
- Success message
- Event created
- Visible in events list

**Status:** [ ] Pass [ ] Fail

### Test 9B: View Events

**Steps:**
1. Click "Events" in navigation
2. Verify:
   - Events list loads
   - Event details visible
   - Ticket price shown
   - Available tickets shown

**Status:** [ ] Pass [ ] Fail

### Test 9C: Purchase Ticket

**Steps:**
1. Login as any user
2. View event details
3. Click "Purchase Ticket"
4. Select payment method
5. Upload proof of payment (for manual)
6. Complete purchase

**Expected Result:**
- Success message
- "Check your email for QR code"
- Ticket appears in "My Tickets"

**Status:** [ ] Pass [ ] Fail

### Test 9D: View My Tickets

**Steps:**
1. Go to profile
2. Click "My Tickets"
3. Verify:
   - Purchased tickets visible
   - QR code displayed
   - Event details shown
   - Download button works

**Status:** [ ] Pass [ ] Fail

### Test 9E: Verify Ticket (Venue)

**Steps:**
1. Login as venue owner
2. Scan QR code or enter ticket code
3. Verify ticket

**Expected Result:**
- Ticket validated
- Marked as used
- Cannot be used again

**Status:** [ ] Pass [ ] Fail

---

## ✅ Test 10: Feature Locking

### Test 10A: Contact Information Lock

**Steps:**
1. Login as free visitor
2. View escort profile
3. Click "View Contact"

**Expected Result:**
- Error: "Contact information locked"
- Prompt to upgrade to premium

**Status:** [ ] Pass [ ] Fail

### Test 10B: Posting Lock

**Steps:**
1. Login as escort WITHOUT subscription
2. Try to create post

**Expected Result:**
- Error: "Active subscription required to post"

**Status:** [ ] Pass [ ] Fail

### Test 10C: Event Creation Lock

**Steps:**
1. Login as venue WITHOUT subscription
2. Try to create event

**Expected Result:**
- Error: "Active subscription required to post events"

**Status:** [ ] Pass [ ] Fail

---

## ✅ Test 11: Search Functionality

### Test 11A: Search Users

**Steps:**
1. Click "Search" in navigation
2. Enter search term
3. Select user type filter
4. Click "Search"

**Expected Result:**
- Results load
- Matching profiles displayed
- Can click to view profile

**Status:** [ ] Pass [ ] Fail

---

## ✅ Test 12: Mobile Responsiveness

### Test 12A: Mobile View

**Steps:**
1. Open site on mobile device or resize browser to mobile width
2. Verify:
   - Bottom navigation visible
   - All buttons accessible
   - Forms usable
   - Images scale properly
   - Text readable

**Status:** [ ] Pass [ ] Fail

---

## ✅ Test 13: Security

### Test 13A: Age Verification

**Steps:**
1. Clear browser data
2. Visit site
3. Click "Exit" on age verification

**Expected Result:**
- Redirected away from site

**Status:** [ ] Pass [ ] Fail

### Test 13B: Authentication Required

**Steps:**
1. Logout
2. Try to access protected pages:
   - Profile
   - Create Post
   - Messages
   - Affiliates

**Expected Result:**
- Login modal appears
- Cannot access without login

**Status:** [ ] Pass [ ] Fail

### Test 13C: Password Security

**Steps:**
1. Register with weak password

**Expected Result:**
- Password requirements enforced
- Password hashed in database (not plain text)

**Status:** [ ] Pass [ ] Fail

---

## 📊 Testing Summary

### Total Tests: 40+

**Passed:** _____ / 40+

**Failed:** _____ / 40+

**Skipped:** _____ / 40+

---

## 🐛 Issues Found

| Test # | Issue Description | Severity | Status |
|--------|------------------|----------|--------|
|        |                  |          |        |
|        |                  |          |        |
|        |                  |          |        |

---

## 📝 Notes

- Test with different browsers (Chrome, Firefox, Edge, Safari)
- Test on different devices (Desktop, Tablet, Mobile)
- Test with slow internet connection
- Test with large file uploads
- Test concurrent users

---

## ✅ Production Readiness Checklist

Before deploying to production:

- [ ] All tests passed
- [ ] Database backed up
- [ ] Environment variables secured
- [ ] SSL certificate installed
- [ ] Payment gateways configured
- [ ] Email service configured
- [ ] SMS service configured (optional)
- [ ] Monitoring set up
- [ ] Error logging configured
- [ ] Rate limiting enabled
- [ ] CDN configured for media
- [ ] Backup strategy in place
- [ ] Domain configured
- [ ] Terms of service added
- [ ] Privacy policy added
- [ ] GDPR compliance checked

---

**Happy Testing! 🎉**
