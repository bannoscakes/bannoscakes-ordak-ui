# Ordak Order Management

Production floor order tracking system for Bannos Cakes bakery with barcode scanning, real-time queue management, and multi-store support.

## Overview

Ordak manages cake orders through production stages (Filling → Covering → Decorating → Packing → Complete) for two stores:
- **Bannos Cakes** - Main bakery
- **Flour Lane** - Second location

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Row Level Security, Edge Functions)
- **Integrations**: Shopify Admin API (orders, products, inventory sync)

## Key Features

| Feature | Description |
|---------|-------------|
| **Production Queue** | Real-time order queue with stage filtering and assignment |
| **Barcode Scanning** | Camera-based scanning for stage transitions |
| **Staff Management** | Shifts, breaks, time tracking, performance metrics |
| **Inventory** | Components, BOMs, Accessories, Cake Toppers with stock tracking |
| **Analytics** | Store performance, revenue, staff productivity dashboards |
| **Messaging** | Internal team conversations with unread tracking |
| **Monitor Display** | TV-optimized queue view for production floor |

## Role-Based Access

| Role | Access |
|------|--------|
| **Staff** | Personal queue, scanner, stage transitions |
| **Supervisor** | Full queue view, assignments, monitor display |
| **Admin** | All features + settings, staff management, analytics |

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type check
npm run type-check

# Build for production
npm run build
```

## Project Structure

```
src/
├── components/       # React components (51 files)
│   ├── inventory-v2/ # Inventory management tabs
│   ├── messaging/    # Chat components
│   └── ui/           # shadcn/ui primitives
├── hooks/            # React Query hooks (13 files)
├── lib/              # Utilities and RPC client (20 files)
└── types/            # TypeScript definitions

supabase/
├── migrations/       # Database migrations (125 files)
└── functions/        # Edge Functions (10 functions)
```

## Database

All writes go through `SECURITY DEFINER` RPCs for security. Direct table access is blocked by RLS policies.

Key tables:
- `orders_bannos` / `orders_flourlane` - Order data per store
- `staff_shared` - Staff profiles and roles
- `components` / `boms` / `accessories` - Inventory
- `conversations` / `messages` - Messaging

## Edge Functions

| Function | Purpose |
|----------|---------|
| `shopify-webhooks-bannos` | Receive Bannos webhook orders |
| `shopify-webhooks-flourlane` | Receive Flourlane webhook orders |
| `queue-worker` | Process background job queue |
| `sync-inventory-to-shopify` | Push stock levels to Shopify |

## Documentation

See `/docs` for detailed documentation:
- `overview.md` - System architecture
- `schema-and-rls.md` - Database schema
- `runbook.md` - Operations guide
- `DEPLOY_PRODUCTION.md` - Deployment guide

## Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Contributing

1. Create feature branch from `dev`
2. Run `npm run type-check` before committing
3. Open PR for review - never merge directly
4. Never push to `main` without approval
