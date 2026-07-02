# CamAIvo

**Plateforme de face-swap vidéo en temps réel** — change d'apparence en direct via ta webcam, avec un système de points à la minute.

> Slogan : *SWAP EN TEMPS RÉEL* · Support : [@camaivo_support](https://t.me/camaivo_support)

## Stack

- React 18 + TypeScript strict + Vite
- Tailwind CSS (design system dark glassmorphism) + Framer Motion
- Zustand (state) · React Router v6 · lucide-react
- Supabase (Postgres, Auth, Storage, RLS, Edge Functions)
- Stripe + adaptateur Mobile Money
- Moteur de swap via adaptateur `SwapEngine` : `mock` | `local` | `cloud`

## Démarrage

```bash
npm install
cp .env.example .env   # remplir les clés (Supabase, Stripe…)
npm run dev
```

L'app tourne entièrement en mode `mock` (`VITE_SWAP_MODE=mock`) sans GPU ni backend de swap.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de dev Vite |
| `npm run build` | Typecheck + build production |
| `npm run lint` | ESLint |
| `npm run test` | Tests Vitest (logique de points) |

## Avancement (phases)

- [x] **Phase 0** — Setup : Vite/TS/Tailwind, design tokens, logo, routing, layout (sidebar + header + bulle d'aide), primitives UI
- [x] **Phase 1** — Supabase & Auth : schéma + RLS + trigger profil, login/register/forgot, routes protégées
- [x] **Phase 2** — Dashboard Live Swap (mode mock) : SwapEngine, webcam, avatars, start/stop, timer
- [x] **Phase 3** — Système de points : Edge Function `consume-points`, heartbeats 10 s, débit serveur atomique, coupure à 0
- [ ] Phase 4 — Mes Avatars
- [ ] Phase 5 — Recharge / Paiements
- [ ] Phase 6 — Statistiques & Paramètres
- [ ] Phase 7 — Adaptateurs réels (local WebSocket / cloud WebRTC)
- [ ] Phase 8 — Finitions & déploiement

## Usage responsable

CamAIvo intègre un cadre d'usage responsable : n'utiliser que des avatars dont on détient les droits, aucune usurpation d'identité de personnes réelles sans consentement, option de filigrane sur la sortie.
