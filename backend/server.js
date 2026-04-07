import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// Static files (success.html, cancel.html)
app.use(express.static(path.join(__dirname, '..')));
app.use(cors());
app.use(express.json());

// 🟢 DEBUG TOUTES les requêtes
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// STRIPE
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error('❌ STRIPE_SECRET_KEY manquante !');
  process.exit(1);
}
const stripe = new Stripe(stripeKey);
console.log('✅ Stripe initialisé');

// 🟢 ROUTES
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'audiodeliv backend LIVE 🚀',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
  });
});

app.post('/api/create-checkout-session', async (req, res) => {
  console.log('🟢 POST /api/create-checkout-session HIT !');
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Pack MP3 audiodeliv',
            description: 'Achat test boutique audio'
          },
          unit_amount: 500
        },
        quantity: 1
      }],
      success_url: `${process.env.APP_URL || 'https://audiodeliv.onrender.com'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'https://audiodeliv.onrender.com'}/cancel.html`
    });
    res.json({ url: session.url });
  } catch (error) {
    console.error('🔴 Stripe error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend audiodeliv sur port ${PORT}`);
});
