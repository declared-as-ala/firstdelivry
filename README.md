# LogiFlow — Centre de contrôle logistique & COD

Plateforme de gestion des expéditions COD Navex pour e-commerce en Tunisie.

## Stack

- **Next.js 16** (App Router)
- **TypeScript** strict
- **MongoDB** + Mongoose
- **NextAuth.js** (Credentials)
- **Tailwind CSS v4** + shadcn/ui
- **Zod** validation

## Installation

```bash
# Clone & install
cd logiflow
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your MongoDB URI

# Seed database
npm run seed

# Start development
npm run dev
```

## Default Users (seed)

| Role | Email | Password |
|------|-------|----------|
| SUPER_ADMIN | admin@logiflow.tn | admin123 |
| WAREHOUSE_OPERATOR | operateur@logiflow.tn | operateur123 |
| FINANCE | finance@logiflow.tn | finance123 |
| MANAGER | manager@logiflow.tn | manager123 |
| VIEWER | viewer@logiflow.tn | viewer123 |

## Scripts

```bash
npm run dev       # Start development
npm run build     # Build for production
npm run seed      # Seed database with sample data
npm run lint      # ESLint
```

## Environment Variables

Key variables in `.env.local`:

```
MONGODB_URI      # MongoDB connection string
AUTH_SECRET      # NextAuth secret
CRON_SECRET      # Cron job auth secret
NAVEX_*_TOKEN    # Navex API tokens
```

## Navex Integration

All Navex API calls are server-side only. Mock mode activates automatically when tokens are not configured.

See `docs/NAVEX_INTEGRATION.md` for endpoint paths that need confirmation from Navex.

## Architecture

See `docs/ARCHITECTURE.md` for data models, status architecture, and key flows.

## Workflows

See `docs/WORKFLOWS.md` for operational workflows.

## Modules

- **Dashboard** — KPIs, stats, alerts
- **Commandes** — Order management, search, filters
- **Préparation** — Warehouse prep queue
- **Scan** — Barcode scan station (3 modes)
- **Expéditions** — Navex shipment management
- **Suivi** — Tracking sync with Navex
- **Recettes** — Payment reconciliation
- **Retours** — Return management & inspection
- **Stock** — Inventory movements
- **Import** — CSV/Excel order import
- **Analytique** — Charts & metrics
- **Paramètres** — System config & users

## Connecting an Ecommerce Store

Use the API import endpoint:

```bash
POST /api/orders/import
Headers: x-api-key <your-api-key>
Body: { orders: [...] }
```

The `OrderSourceAdapter` interface allows plugging Shopify, WooCommerce, or custom sources.

## License

Private — Internal use only
