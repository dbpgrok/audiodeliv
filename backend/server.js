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

// ✅ Static files
app.use(express.static(path.join(__dirname, '..')));

app.use(cors());
app.use(express.json());

// ✅ STRIPE avec check
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error('❌ STRIPE_SECRET_KEY manquante dans Render Environment !');
  process.exit(1);
}
const stripe = new Stripe(stripeKey);
console.log('✅ Stripe initialisé');

// ... tes routes existantes

app.listen(PORT, () => {
  console.log(`🚀 Backend audiodeliv sur port ${PORT}`);
});
