const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Booking = require('../models/Booking');

router.post('/create-payment', async (req, res) => {
    try {
        const { paymentMethodId, amount, currency, packageName, eventDate, userId } = req.body;

        // Create a payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: currency,
            payment_method: paymentMethodId,
            confirm: true,
            return_url: `${process.env.DOMAIN}/payment-success`,
            metadata: {
                packageName: packageName,
                eventDate: eventDate,
                userId: userId
            }
        });

        // إذا نجح الدفع، قم بإنشاء حجز جديد في قاعدة البيانات
        if (paymentIntent.status === 'succeeded') {
            const booking = new Booking({
                userId: userId,
                packageName: packageName,
                eventDate: eventDate,
                amount: amount / 100, // تحويل من سنتات إلى وحدات العملة
                paymentId: paymentIntent.id,
                status: 'confirmed'
            });
            
            await booking.save();
        }

        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            bookingId: paymentIntent.id
        });
    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// إضافة مسار لصفحة نجاح الدفع
router.get('/payment-success', async (req, res) => {
    try {
        const { payment_intent } = req.query;
        
        if (payment_intent) {
            const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent);
            
            if (paymentIntent.status === 'succeeded') {
                // يمكنك هنا عرض تفاصيل الحجز أو إرسال بريد إلكتروني تأكيد
                res.render('payment-success', {
                    booking: {
                        id: paymentIntent.id,
                        packageName: paymentIntent.metadata.packageName,
                        eventDate: paymentIntent.metadata.eventDate,
                        amount: paymentIntent.amount / 100
                    }
                });
            } else {
                res.redirect('/payment-failed');
            }
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.error('Error retrieving payment:', error);
        res.redirect('/payment-failed');
    }
});

module.exports = router; 