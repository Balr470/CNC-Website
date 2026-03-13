const cron = require('node-cron');
const User = require('../models/User.model');
const sendEmail = require('../services/email.service');
const Design = require('../models/Design.model');

const startCartAbandonmentJob = () => {
    // Run every day at 10 AM
    cron.schedule('0 10 * * *', async () => {
        try {
            console.log('[Cron] Running Abandoned Cart Email Scan...');

            // BUG FIX #1: Was using { $exists: false } which means after the FIRST
            // email ever, the user NEVER gets another abandoned-cart email even if
            // they abandon their cart again weeks later.
            // Fix: use a 24-hour cooldown window instead of a simple existence check.
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            const usersWithAbandonedCarts = await User.find({
                'cart.0': { $exists: true },
                // Only target carts updated within last 7 days to avoid staleness
                updatedAt: { $gte: sevenDaysAgo },
                // Max 3 reminder emails per cart session
                $expr: { $lt: [{ $ifNull: ['$abandonedCartEmailCount', 0] }, 3] },
                $or: [
                    { lastAbandonedCartEmailSentAt: { $exists: false } },
                    { lastAbandonedCartEmailSentAt: { $lt: oneDayAgo } }
                ]
            }).populate('cart', 'title price');

            let emailsSent = 0;

            for (const user of usersWithAbandonedCarts) {
                // BUG FIX #2: Soft-deleted designs return null from populate.
                // Accessing item.title or item.price on a null crashes the entire cron job loop.
                // Filter out nulls before processing.
                const validCartItems = user.cart.filter(item => item != null);
                if (validCartItems.length === 0) continue;

                const numItems = validCartItems.length;
                let cartSummary = '';
                let totalValue = 0;

                validCartItems.forEach((item) => {
                    cartSummary += `- ${item.title} (₹${item.price})\n`;
                    totalValue += item.price;
                });

                const emailMessage = `Hi ${user.name},\n\nYou left ${numItems} item(s) in your cart worth ₹${totalValue}. Come back and complete your purchase!\n\nYour Cart Items:\n${cartSummary}\nThanks,\nCNC Market Team`;

                try {
                    await sendEmail({
                        email: user.email,
                        subject: 'Did you forget something? Complete your purchase!',
                        message: emailMessage
                    });

                    user.lastAbandonedCartEmailSentAt = new Date();
                    user.abandonedCartEmailCount = (user.abandonedCartEmailCount || 0) + 1;
                    await user.save({ validateBeforeSave: false });
                    emailsSent++;
                } catch (emailError) {
                    console.error(`[Cron] Error sending email to ${user.email}:`, emailError);
                }
            }
            console.log(`[Cron] Finished scanning. Sent ${emailsSent} emails.`);

        } catch (error) {
            console.error('[Cron] Error in Abandoned Cart Job:', error);
        }
    });
};

module.exports = startCartAbandonmentJob;
