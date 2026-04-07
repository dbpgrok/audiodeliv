import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import path from 'path';  // ← AJOUTE ÇA
import { fileURLToPath } from 'url';  // ← AJOUTE ÇA

dotenv.config();

const __filename = fileURLToPath(import.meta.url);  // ← AJOUTE ÇA
const __dirname = path.dirname(__filename);  // ← AJOUTE ÇA

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ AJOUTE ÇA POUR SERVIR success.html et cancel.html
app.use(express.static(path.join(__dirname, '..')));  // ← Racine du projet

app.use(cors());
app.use(express.json());

// ... tes routes existantes restent identiques


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
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Pack MP3 audiodeliv',
              description: 'Achat test boutique audio'
            },
            unit_amount: 500
          },
          quantity: 1
        }
      ],
      success_url: `${process.env.APP_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/cancel.html`
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    res.status(500).json({ error: 'Impossible de créer la session Stripe' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend audiodeliv sur port ${PORT}`);
});
