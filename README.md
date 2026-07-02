# CamAIvo

**Plateforme de face-swap vidéo en temps réel** — change d'apparence en direct via ta webcam, avec un système de points à la minute.

> Slogan : *SWAP EN TEMPS RÉEL* · Support : [@camaivo_support](https://t.me/camaivo_support)

## Stack

- **Frontend** : React 18 + TypeScript strict + Vite · Tailwind CSS (dark glassmorphism) · Framer Motion · Zustand · React Router v6 · lucide-react
- **Backend** : Supabase (Postgres + Auth + Storage + RLS + Edge Functions)
- **Paiements** : Stripe (complet) + adaptateur Mobile Money (agrégateur à brancher)
- **Moteur de swap** : adaptateur `SwapEngine` à 3 implémentations — `mock` (démo sans GPU), `local` (sidecar Python WebSocket), `cloud` (WebRTC vers worker GPU)

## Démarrage local

```bash
npm install
cp .env.example .env   # remplir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
npm run dev            # http://localhost:5173
```

L'app est **100 % fonctionnelle en mode `mock`** (`VITE_SWAP_MODE=mock`) : inscription → 500 points offerts → sélection d'avatar → swap simulé (canvas) → décompte de points serveur → statistiques → recharge.

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de dev Vite |
| `npm run build` | Typecheck strict + build production |
| `npm run lint` | ESLint |
| `npm run test` | Tests Vitest (logique de points) |

## Architecture

```
/src
  /app            routing (lazy), layouts, ErrorBoundary
  /pages          un écran par route (§ dashboard, avatars, stats, settings, recharge, auth)
  /components     ui (GlassPanel, Button, Badge…), swap (CameraPanel…), avatars, stats
  /features
    /auth         store Zustand + gardes de routes
    /avatars      upload Storage, CRUD, avatar par défaut
    /credits      barème, miroir de la logique de débit (testé), API sessions/heartbeats
    /payments     packs, adaptateur PaymentProvider (Stripe + stub Mobile Money)
    /stats        agrégation sessions + transactions
    /swap-engine  adaptateur SwapEngine : Mock / Local (WS) / Cloud (WebRTC)
  /stores         uiStore (drawer, toggle cloud/local), swapStore (session), settingsStore
/supabase
  /migrations     schéma + RLS + fonctions SQL (0001 → 0006)
  /functions      consume-points · create-checkout · stripe-webhook
/docs
  SWAP_ENGINE_PROTOCOL.md   contrat WebSocket du sidecar Python + signalisation WebRTC
```

**Système de points (anti-triche)** : le client envoie un heartbeat toutes les 10 s ; l'Edge Function `consume-points` (JWT vérifié) débite via une fonction SQL atomique basée sur l'horloge **serveur** (tranche bornée à 30 s), journalise dans `point_transactions` et **coupe la session à solde 0**. Barème : `POINTS_PAR_MINUTE = 20` (500 pts ≈ 25 min).

## Déploiement

### 1. Supabase

1. Crée un projet sur [supabase.com](https://supabase.com) (ou utilise l'existant).
2. Applique les migrations dans l'ordre : `supabase/migrations/0001…0006` (SQL Editor, ou `supabase db push` avec la CLI).
3. Déploie les Edge Functions : `supabase functions deploy consume-points create-checkout` et `supabase functions deploy stripe-webhook --no-verify-jwt`.
4. Secrets des fonctions (Dashboard → Edge Functions → Secrets) :
   - `STRIPE_SECRET_KEY` (sk_test_… puis sk_live_…)
   - `STRIPE_WEBHOOK_SECRET` (voir Stripe ci-dessous)
   - `POINTS_PAR_MINUTE` (optionnel, défaut 20)
   - `APP_URL` (URL de prod, pour les redirections de paiement)

### 2. Stripe

1. Dashboard Stripe → Développeurs → Webhooks → « Ajouter un endpoint » :
   `https://<ref-projet>.supabase.co/functions/v1/stripe-webhook`
   avec les événements `checkout.session.completed` et `checkout.session.expired`.
2. Copie le secret `whsec_…` dans le secret `STRIPE_WEBHOOK_SECRET` de Supabase.
3. Carte de test : `4242 4242 4242 4242`, n'importe quelle date future / CVC.

### 3. Vercel (frontend)

1. Importe le repo dans Vercel (framework : **Vite**). Le `vercel.json` gère déjà les rewrites SPA (React Router).
2. Variables d'environnement du projet : recopie les `VITE_*` du `.env.example` avec les vraies valeurs (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SWAP_MODE`, `VITE_STRIPE_PUBLISHABLE_KEY`, …).
3. Supabase → Auth → URL Configuration : ajoute l'URL Vercel dans *Site URL* / *Redirect URLs* (confirmation email, reset de mot de passe).

### 4. Moteur de swap réel (optionnel)

- **Local** : implémente le contrat de `docs/SWAP_ENGINE_PROTOCOL.md` dans le sidecar Python (squelette fourni), lance-le sur `ws://127.0.0.1:8787`, et mets `VITE_SWAP_MODE=local`.
- **Cloud** : déploie un serveur de signalisation + un worker GPU (aiortc), renseigne `VITE_SIGNALING_WS` et mets `VITE_SWAP_MODE=cloud`.

## Avancement (phases)

- [x] **Phase 0** — Setup : Vite/TS/Tailwind, design tokens, logo, routing, layout, primitives UI
- [x] **Phase 1** — Supabase & Auth : schéma + RLS + trigger profil, login/register/forgot, routes protégées
- [x] **Phase 2** — Dashboard Live Swap (mock) : SwapEngine, webcam, avatars, start/stop, timer
- [x] **Phase 3** — Points : Edge Function `consume-points`, heartbeats 10 s, débit serveur, coupure à 0
- [x] **Phase 4** — Mes Avatars : upload Storage, CRUD, défaut, avatars publics
- [x] **Phase 5** — Recharge : packs EUR/XOF, Stripe Checkout + webhook signé, adaptateur Mobile Money
- [x] **Phase 6** — Statistiques (KPI + graphique 30 j) & Paramètres (webcam, options moteur, sécurité)
- [x] **Phase 7** — Adaptateurs réels : LocalSwapEngine (WS) + CloudSwapEngine (WebRTC) + protocole documenté
- [x] **Phase 8** — Finitions : code-splitting, animations, ErrorBoundary, guide de déploiement

**i18n** : l'UI est 100 % en français. Pour l'internationalisation future, les chaînes sont regroupées par feature/page ; brancher `react-i18next` et extraire par domaine (auth, swap, payments…) est le chemin prévu.

## Usage responsable

CamAIvo intègre un cadre d'usage responsable : n'utiliser que des avatars dont on détient les droits, consentement explicite pour toute image de visage source, aucune usurpation d'identité de personnes réelles, **filigrane activable** sur la sortie (activé par défaut). Voir la section « Usage responsable » dans Paramètres.
