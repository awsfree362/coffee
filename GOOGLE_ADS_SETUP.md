# Google AdSense Setup Guide

## Current Implementation

The Coffee platform now has Google AdSense ad space integrated in the hero section of the home page.

### Location
- **Home Page Hero Section** - Below the "Welcome to Coffee" title, above the Browse/Join buttons

### Ad Specifications
- **Ad Type**: Display Ad (Responsive)
- **Format**: Auto (adapts to available space)
- **Minimum Height**: 250px
- **Full Width**: Responsive to container

---

## Setup Instructions

### Step 1: Create Google AdSense Account
1. Go to https://www.google.com/adsense
2. Sign up with your Google account
3. Enter your website URL: `https://your-coffee-domain.com`
4. Complete the application process
5. Wait for approval (typically 1-3 days)

### Step 2: Get Your Publisher ID
Once approved, you'll receive:
- **Publisher ID**: `ca-pub-XXXXXXXXXXXXXXXX` (16 digits)

### Step 3: Create Ad Unit
1. Log into AdSense dashboard
2. Go to **Ads** → **By ad unit** → **Display ads**
3. Click **New ad unit**
4. Name it: "Coffee Hero Banner"
5. Choose **Responsive** ad type
6. Click **Create**
7. Copy the **Ad Slot ID**: `XXXXXXXXXX`

### Step 4: Update Your Code

#### In `templates/index.html` (Line 11):
Replace:
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
```

With your actual Publisher ID:
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456"
```

#### In `static/js/app.js` (renderHomePage function):
Replace these two values:
```javascript
data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"  // Your Publisher ID
data-ad-slot="XXXXXXXXXX"                  // Your Ad Slot ID
```

Example:
```javascript
data-ad-client="ca-pub-1234567890123456"
data-ad-slot="9876543210"
```

### Step 5: Verify AdSense Code
1. In AdSense dashboard, go to **Sites**
2. Click **Ready to connect your site**
3. Copy the verification code (if required)
4. Paste it in the `<head>` section of `index.html`

### Step 6: Test Your Ads
1. Deploy your website to production
2. Visit your homepage
3. Ads may take 24-48 hours to start showing
4. Initially you'll see blank space or placeholder
5. Check AdSense dashboard for impressions

---

## Important Notes

### Ad Policies
- ✅ **Allowed**: Adult dating, escort services (with restrictions)
- ❌ **Not Allowed**: Explicit sexual content, pornography
- ⚠️ **Required**: Age verification (already implemented)

### Content Guidelines
- Keep content professional
- No explicit images in ad vicinity
- Clear age verification (18+)
- Proper content labeling

### Optimization Tips
1. **Ad Placement**: Currently in hero section (high visibility)
2. **Ad Size**: Responsive (adapts to all devices)
3. **Loading**: Async (doesn't block page load)
4. **Frequency**: One ad per page (can add more later)

### Revenue Expectations
- **CPM**: $1-$5 per 1,000 impressions (varies by region)
- **CPC**: $0.10-$2.00 per click (varies by niche)
- **Payment**: Monthly via bank transfer (minimum $100)

---

## Additional Ad Placements (Optional)

### 1. Search Results Page
Add between profile cards:
```javascript
// In renderSearchPage() after every 8 profiles
<div class="col-span-2 md:col-span-4">
    <ins class="adsbygoogle"
         style="display:block"
         data-ad-format="fluid"
         data-ad-layout-key="-6t+ed+2i-1n-4w"
         data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
         data-ad-slot="YYYYYYYYYY"></ins>
</div>
```

### 2. Profile Modal
Add at bottom of profile view:
```javascript
// In showProfileModal() before buttons
<div class="mb-4">
    <ins class="adsbygoogle"
         style="display:block"
         data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
         data-ad-slot="ZZZZZZZZZZ"
         data-ad-format="auto"></ins>
</div>
```

### 3. Events Page
Add between event cards

### 4. Posts Feed
Add every 5-10 posts

---

## Troubleshooting

### Ads Not Showing?
1. **Wait 24-48 hours** after setup
2. Check AdSense account is **approved**
3. Verify **Publisher ID** is correct
4. Check browser **ad blockers** are disabled
5. Ensure site is **live** (not localhost)
6. Check AdSense dashboard for **policy violations**

### Blank Ad Space?
- Normal during first 24-48 hours
- AdSense is learning your audience
- May show blank if no relevant ads available
- Check ad unit is **active** in dashboard

### Low Revenue?
- Increase traffic to your site
- Add more ad units (max 3 per page recommended)
- Optimize ad placement (above the fold)
- Target high-value keywords
- Improve user engagement (longer sessions)

---

## Alternative Ad Networks

If Google AdSense rejects your application:

### 1. **Media.net**
- Yahoo/Bing network
- Good for adult dating sites
- Similar to AdSense

### 2. **PropellerAds**
- Adult-friendly
- Push notifications, pop-unders
- Lower CPM but higher fill rate

### 3. **ExoClick**
- Adult advertising network
- Specialized in dating/escort sites
- Higher CPM for adult content

### 4. **TrafficJunky**
- Adult traffic monetization
- Banner ads, native ads
- Good for escort platforms

---

## Current Ad Status

✅ **Ad Space Created**: Hero section on home page  
⏳ **Pending**: Google AdSense account setup  
⏳ **Pending**: Publisher ID and Ad Slot ID  
⏳ **Pending**: Code update with real IDs  

---

## Next Steps

1. Apply for Google AdSense account
2. Wait for approval
3. Get Publisher ID and Ad Slot ID
4. Update the code with real IDs
5. Deploy to production
6. Monitor AdSense dashboard for performance

---

**Note**: The placeholder text "Advertisement Space" will automatically disappear once real ads start serving.
