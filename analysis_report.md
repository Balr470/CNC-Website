# CNC Marketplace Architecture & Issues Analysis

## Global User Rule Constraints Validation
- **Rule 1**: `always migrate api have same core logic and have one-two-one mapping with old api` 
- **Rule 2**: `all the small validation should be done at controller level, only business logic should be in service`

## System Architecture

The application is a standard MERN stack web app.
### Backend Stack:
- Express / Node.js
- MongoDB / Mongoose
- Models: User, Design, Order, Review, Bundle
- Cloudinary (for image previews & watermarks)
- Cloudflare R2 / AWS S3 SDK (for CNC file storage and signed URLs)
- Razorpay setup for processing payments

---

## ✅ Completed Fixes

| # | Issue | Fix Applied |
|---|-------|-------------|
| 1 | Cart/Wishlist limit in service layer (Rule violation) | Moved to `auth.controller.js` |
| 2 | ObjectId validation missing in download & review controllers | Added `^[0-9a-fA-F]{24}$` checks |
| 3 | Subscription deduction inside GET request | Removed (subscription fully removed) |
| 4 | ReDoS in `fileType` filter in `design.service.js` | Escaped regex input before `RegExp` |
| 5 | Bundle controller mass assignment / no validation | Full field destructuring & validation added |
| 9 | Broken signed URL (Cloudinary signing R2 files) | `generateSignedUrl.js` now uses `@aws-sdk/s3-request-presigner` |
| 11 | XSS sanitizer bypass for `multipart/form-data` uploads | Manual XSS applied inside `design.controller.js` after multer |
| 13 | Infinite abandoned cart email spam | 3-email cap + 7-day staleness check added |
| 14 | Global error handler bypass via `serverError()` | Replaced with `next(error)` across all controllers |
| 15 | Mass assignment on Bundle Create | See fix #5 |
| 16 | Race condition in download counter | Already resolved (subscription removed) |
| 17 | Unbounded review fetching (no pagination) | `getDesignReviews` now paginated with `page`/`limit` |

---

## ⏳ Remaining Issues

### 6. Bundle Payment Integration
- `payment.controller.js` (`createOrder` / `verifyPayment`) only processes arrays of `designIds`
- If a user buys a bundle, there is no logic to process `bundleId`, assign bundle price, or grant access to designs inside the bundle
- **Fix**: Decide if bundles are paid via cart (explode into designIds) or a dedicated `POST /payments/bundle` endpoint

### 10. Memory Constraints in Multer Buffer
- `multer.middleware.js` buffers CNC files **entirely in memory** before upload
- A 50MB CNC file fully occupies RAM. Under concurrent uploads this crashes the server.
- **Fix**: Use `multer.diskStorage()` to write temp files to disk, then stream to R2

### 12. Inconsistent State in Payment Verification
- `payment.service.js` marks the order `paymentStatus: 'success'` before verifying user ownership
- If user lookup fails after this, the order is permanently stuck in a success state
- **Fix**: Verify ownership first, then update payment status atomically

### 8. Hardcoded Email Host
- `email.service.js` hardcodes `EMAIL_HOST` to `'sandbox.smtp.mailtrap.io'`
- **Fix**: Move to environment variable `process.env.EMAIL_HOST`

---

## 🚀 Production Features — Remaining

| Priority | Feature | Notes |
|---|---|---|
| 🟠 High | Improved Health Check endpoint | Add DB state + uptime for monitoring tools |
| 🟠 High | SIGTERM/SIGINT graceful shutdown | Prevents data corruption on Render/Railway redeploy |
| 🟠 High | Download History tracking | Users can re-download past purchases |
| 🟡 Medium | Multer disk storage instead of memory | Needed for 50MB+ concurrent uploads |
| 🟡 Medium | Payment race condition fix | Atomic order status update |
| 🟡 Medium | Bundle payment integration | Requires design decision |
| 🟢 Later | Redis caching | Needs Upstash/Railway Redis account |
| 🟢 Later | Refresh token system | 15-min access + 7-day refresh tokens |
| 🟢 Later | Stripe webhook | If switching from Razorpay to Stripe |
