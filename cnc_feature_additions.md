# 🛠️ CNC Marketplace — Production Feature Additions

> Already completed: **Helmet · Morgan → Winston · HPP · Rate Limiting · Mongo Sanitize · Graceful Shutdown · Env Validation · Global Error Handler · Winston Logger · Response Compression · Morgan file logging**

---

## ✅ Completed Features

| Feature | Status |
|---------|--------|
| Winston structured logger | ✅ Done |
| Response compression | ✅ Done |
| Morgan → file logging in production | ✅ Done |
| XSS fix for multipart/form-data | ✅ Done |

---

## ⏳ Remaining Features

### 1. 🏥 Improved Health Check Endpoint
Add DB connection state + uptime for monitoring tools (UptimeRobot, BetterStack, Render).

```js
// In app.js — replace existing /api/health route
app.get('/api/health', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.status(dbState === 1 ? 200 : 503).json({
    status: dbState === 1 ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    database: dbStatus[dbState],
    environment: process.env.NODE_ENV,
  });
});
```

---

### 2. 🔌 SIGTERM / SIGINT Graceful Shutdown
Prevents data corruption and connection leaks on cloud redeploys.

```js
// Add to server.js after app.listen(...)
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(async () => {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed. Process exiting.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
```

---

### 3. 📜 Download History Tracking
Track what each user downloaded and when — users can re-download past purchases.

**Add to `User.model.js`:**
```js
downloadHistory: [{
  design: { type: mongoose.Schema.ObjectId, ref: 'Design' },
  downloadedAt: { type: Date, default: Date.now }
}],
```

**Update `download.service.js` after URL generation:**
```js
await User.findByIdAndUpdate(user._id, {
  $push: {
    downloadHistory: {
      $each: [{ design: design._id }],
      $slice: -100 // Keep last 100 only
    }
  }
});
await Design.findByIdAndUpdate(design._id, { $inc: { downloads: 1 } });
```

**New route:** `GET /api/v1/auth/download-history`

---

### 4. 🗂️ Multer Disk Storage (for large concurrent uploads)
Current memory buffering crashes on concurrent 50MB uploads.

Replace `hybridStorage` in `multer.middleware.js` with `diskStorage()` — write temp file to disk, stream to R2, then delete the temp file.

---

### 5. ✅ Zod Input Validation
Replace all manual `if (!field)` checks with schema-driven validation.

```bash
npm install zod
```

```js
// src/validators/design.validator.js
const { z } = require('zod');
const createDesignSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  price: z.coerce.number().min(0).max(100000),
  category: z.enum(['3d-designs', '2d-designs', '3d-doors-design',
    '2d-grill-designs', '2d-door-designs', 'temple-designs', '3d-traditional', 'other']),
});
```

---

### 6. ⚡ Redis Caching (add when traffic grows)
Cache popular/category listings for 5 minutes — reduces DB load to near zero on repeated queries.

> Requires: [Upstash](https://upstash.com) free tier (serverless Redis, no server needed)

```bash
npm install ioredis
```

---

### 7. 🔒 Refresh Token System
15-min access tokens + 7-day refresh token in httpOnly cookie — reduces attack window from 30 days to 15 minutes if a token is stolen.

- Add `refreshToken: { type: String, select: false }` to `User.model.js`
- New route: `POST /api/v1/auth/refresh`
- Rotate refresh token on every use (prevents replay attacks)

---

### 8. 🔔 Stripe Webhook (if switching from Razorpay)
Server-side payment confirmation via `checkout.session.completed` event.

```js
// Must use raw body for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleStripeWebhook);
```

---

## 📦 Recommended Next Steps

| Priority | Feature | Notes |
|---|---|---|
| 🟠 1st | Health Check endpoint | 10 lines, needed for Render monitoring |
| 🟠 2nd | SIGTERM graceful shutdown | Prevents data loss on redeploy |
| 🟠 3rd | Download History | Great UX, easy to add |
| 🟡 4th | Multer disk storage | Needed for 50MB+ concurrent uploads |
| 🟡 5th | Zod validation | Cleaner controller code |
| 🟢 6th | Redis caching | When traffic grows |
| 🟢 7th | Refresh token system | Security upgrade |
| 🟢 8th | Stripe webhook | If switching from Razorpay |
