import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Directories
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const ORDERS_DIR = path.join(__dirname, 'orders');
const DELIVERABLES_DIR = path.join(__dirname, 'deliverables');

[ORDERS_DIR, DELIVERABLES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Stripe init
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error('❌ STRIPE_SECRET_KEY manquante !');
  process.exit(1);
}
const stripe = new Stripe(stripeKey);
console.log('✅ Stripe initialisé');

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Sécurité : bloquer l'accès aux dossiers sensibles
   AVANT express.static pour empêcher toute fuite
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
app.use(['/backend', '/docs', '/frontend', '/.env'], (req, res) => {
  res.status(404).send('Not found');
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Static files (index.html, success.html, cancel.html, audio/)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
app.use(express.static(path.join(__dirname, '..')));
app.use(cors());

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   1. WEBHOOK STRIPE
   ⚠️  express.raw() AVANT express.json()
   Le raw body est requis pour la vérification de signature
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!WEBHOOK_SECRET) {
    console.error('❌ STRIPE_WEBHOOK_SECRET non configuré');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Signature webhook invalide:', err.message);
    return res.status(400).json({ error: 'Signature invalide' });
  }

  console.log(`🔔 Webhook reçu: ${event.type}`);

  // ── checkout.session.completed ──
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      const token = crypto.randomBytes(32).toString('hex');

      const order = {
        sessionId: session.id,
        email: session.customer_details?.email || session.customer_email || '',
        paymentStatus: session.payment_status || 'paid',
        productName: 'Pack MP3 audiodeliv',
        amountTotal: session.amount_total,
        currency: session.currency,
        paidAt: new Date().toISOString(),
        fulfilled: true,
        downloadToken: token,
        downloadUrl: `/download/${token}`
      };

      const filePath = path.join(ORDERS_DIR, `${session.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(order, null, 2));

      console.log(`✅ Commande enregistrée: ${session.id}`);
      console.log(`   📧 Email: ${order.email}`);
      console.log(`   💰 Montant: ${order.amountTotal} ${order.currency}`);
      console.log(`   🔗 Download: /download/${token}`);
    } catch (err) {
      console.error('❌ Erreur enregistrement commande:', err.message);
    }
  }

  res.json({ received: true });
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   JSON parser pour toutes les autres routes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
app.use(express.json());

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Debug logger
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ROUTES API existantes (inchangées)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
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
  console.log('🟢 POST /api/create-checkout-session');
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Pack MP3 audiodeliv',
            description: 'Pack audio haute qualité'
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

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   4. ENDPOINT ORDER-STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
app.get('/api/order-status', (req, res) => {
  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ found: false, error: 'session_id requis' });
  }

  // Sanitize: only allow alphanumeric, underscore, hyphen
  if (!/^[a-zA-Z0-9_-]+$/.test(session_id)) {
    return res.status(400).json({ found: false, error: 'session_id invalide' });
  }

  try {
    const orderPath = path.join(ORDERS_DIR, `${session_id}.json`);

    if (!fs.existsSync(orderPath)) {
      return res.json({ found: false });
    }

    const order = JSON.parse(fs.readFileSync(orderPath, 'utf-8'));

    res.json({
      found: true,
      fulfilled: order.fulfilled,
      productName: order.productName,
      amountTotal: order.amountTotal,
      currency: order.currency,
      email: order.email || '',
      downloadUrl: order.fulfilled ? order.downloadUrl : null
    });
  } catch (err) {
    console.error('❌ Erreur lecture commande:', err.message);
    res.status(500).json({ found: false, error: 'Erreur serveur' });
  }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   3. ROUTE DE TÉLÉCHARGEMENT TOKENISÉE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
app.get('/download/:token', (req, res) => {
  const { token } = req.params;

  // Valider le format du token (hex 64 chars)
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return res.status(403).json({ error: 'Token invalide' });
  }

  try {
    // Chercher la commande correspondant au token
    const files = fs.readdirSync(ORDERS_DIR).filter(f => f.endsWith('.json'));
    let matchedOrder = null;

    for (const file of files) {
      try {
        const order = JSON.parse(fs.readFileSync(path.join(ORDERS_DIR, file), 'utf-8'));
        if (order.downloadToken === token) {
          matchedOrder = order;
          break;
        }
      } catch { /* skip corrupted files */ }
    }

    if (!matchedOrder) {
      return res.status(404).json({ error: 'Lien de téléchargement invalide ou expiré' });
    }

    if (!matchedOrder.fulfilled) {
      return res.status(403).json({ error: 'Commande non encore traitée' });
    }

    const filePath = path.join(DELIVERABLES_DIR, 'pack-mp3-audiodeliv.mp3');

    if (!fs.existsSync(filePath)) {
      console.error('❌ Fichier livrable introuvable:', filePath);
      return res.status(500).json({ error: 'Fichier non disponible' });
    }

    console.log(`📥 Téléchargement: ${matchedOrder.sessionId} → ${matchedOrder.email}`);

    res.download(filePath, 'audiodeliv-pack-mp3.mp3', (err) => {
      if (err && !res.headersSent) {
        console.error('❌ Erreur téléchargement:', err.message);
        res.status(500).json({ error: 'Erreur lors du téléchargement' });
      }
    });
  } catch (err) {
    console.error('❌ Erreur download:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Global error handler
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
app.use((err, req, res, next) => {
  console.error('❌ Erreur non gérée:', err.message);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Démarrage
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
app.listen(PORT, () => {
  console.log(`🚀 Backend audiodeliv sur port ${PORT}`);
  console.log(`   📂 Orders:       ${ORDERS_DIR}`);
  console.log(`   📦 Deliverables: ${DELIVERABLES_DIR}`);
  console.log(`   🔐 Webhook:      ${WEBHOOK_SECRET ? '✅ configuré' : '⚠️  NON CONFIGURÉ'}`);
});
