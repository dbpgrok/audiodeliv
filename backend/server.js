import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'audiodeliv backend LIVE 🚀',
    timestamp: new Date().toISOString()
  });
});

// Config publique (pour frontend)
app.get('/api/config', (req, res) => {
  res.json({
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_...',
    solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend audiodeliv sur port ${PORT}`);
  console.log(`✅ Health: http://localhost:${PORT}/api/health`);
});

