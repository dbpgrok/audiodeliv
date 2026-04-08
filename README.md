# audiodeliv

Boutique en ligne de fichiers MP3 avec paiement Stripe et livraison digitale.

## Stack

- **Backend** : Node.js / Express
- **Frontend** : HTML / CSS / JS vanilla
- **Paiement** : Stripe Checkout
- **Hébergement** : Render

## Structure

```
audiodeliv/
├── index.html              ← Boutique (pré-écoute 30s + achat)
├── success.html            ← Page post-paiement (statut + téléchargement)
├── cancel.html             ← Page d'annulation
├── audio/
│   └── demo-track.mp3      ← Fichier de pré-écoute (public)
├── backend/
│   ├── server.js           ← API Express + Stripe + webhooks
│   ├── package.json
│   ├── .env.example
│   ├── orders/             ← Commandes payées (JSON, gitignored)
│   └── deliverables/
│       └── pack-mp3-audiodeliv.mp3  ← Fichier livré après achat (protégé)
└── docs/
```

## Routes API

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/config` | Clé publique Stripe |
| POST | `/api/create-checkout-session` | Crée une session Stripe Checkout |
| POST | `/api/webhook` | Webhook Stripe (checkout.session.completed) |
| GET | `/api/order-status?session_id=...` | Statut d'une commande |
| GET | `/download/:token` | Téléchargement sécurisé via token |

## Variables d'environnement (Render)

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_URL=https://audiodeliv.onrender.com
PORT=10000
```

## Configuration Stripe Webhook

1. Aller dans **Stripe Dashboard → Developers → Webhooks**
2. Ajouter un endpoint : `https://audiodeliv.onrender.com/api/webhook`
3. Écouter l'événement : `checkout.session.completed`
4. Copier le **Signing secret** (`whsec_...`)
5. L'ajouter dans Render : **Environment Variables → STRIPE_WEBHOOK_SECRET**

## Flux utilisateur

```
index.html → Écouter 30s → Acheter
  → Stripe Checkout → Paiement
    → Webhook → Commande JSON + token
    → Redirect → success.html
      → Polling /api/order-status
      → Bouton téléchargement → /download/:token
```

## Sécurité

- Les dossiers `/backend/`, `/docs/`, `/frontend/` sont bloqués côté serveur
- Le fichier livrable n'est accessible que via token unique
- La signature du webhook Stripe est vérifiée
- Le raw body est utilisé pour la vérification (avant express.json)
- Les tokens de téléchargement sont des hex 64 caractères (crypto.randomBytes)

## Limitations MVP (améliorations futures)

- Stockage fichier JSON (pas de base de données)
- Les commandes sont perdues lors d'un redéploiement Render
- Pas d'envoi d'email automatique
- Pas de limitation/expiration des liens de téléchargement
- Pas de dashboard admin
