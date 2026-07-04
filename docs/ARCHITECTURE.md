# LogiFlow Architecture

## Technology Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** NextAuth.js with Credentials provider
- **UI:** Tailwind CSS v4 + shadcn/ui components
- **Forms:** React Hook Form + Zod validation
- **Icons:** Lucide React
- **Tables:** TanStack Table (planned for advanced views)
- **Charts:** Recharts (planned for analytics)

## Directory Structure

```
src/
  app/
    (auth)/              # Login page
    (dashboard)/         # All authenticated pages
      dashboard/         # Main dashboard
      orders/            # Order management
      preparation/       # Warehouse preparation
      scan/              # Barcode scan station
      shipments/         # Shipment management
      tracking/          # Shipment tracking
      recettes/          # Payment reconciliation
      returns/           # Return management
      inventory/         # Stock movements
      imports/orders/    # CSV/Excel import
      analytics/         # Dashboards & charts
      settings/          # App config
      settings/users/    # User management
    api/                 # Route handlers
      auth/              # NextAuth
      orders/            # Order CRUD + import
      shipments/         # Shipment CRUD + sync
      scans/             # Barcode scanning
      returns/           # Return inspection
      recettes/          # Payment batches
      inventory/         # Stock movements
      navex/             # Navex API proxy
      users/             # User management
      settings/          # System settings
      dashboard/         # Dashboard stats
      cron/              # Scheduled sync
  lib/
    models/              # Mongoose schemas (16 models)
    navex/               # Navex integration service
    validators/          # Zod schemas
    utils/               # Helpers
    data/                # Static data (governorates)
    auth.ts              # NextAuth config
    db.ts                # MongoDB connection
    permissions.ts       # RBAC system
  components/
    layout/              # Sidebar, dashboard layout
    ui/                  # shadcn/ui components
```

## Data Models

Key collections:
- `users` - Authentication and roles
- `orders` - Ecommerce orders with embedded customer and items
- `shipments` - Navex shipment tracking
- `shipmentEvents` - Status change history
- `shipmentScans` - Barcode scan records
- `returns` - Return tracking
- `returnInspections` - Return inspection results
- `recetteBatches` - Payment batch headers
- `recetteLines` - Payment batch line items
- `inventoryMovements` - Stock movement audit
- `importBatches` - CSV import history
- `importRows` - Individual import row results
- `navexApiLogs` - Navex API call logs
- `systemSettings` - Application configuration
- `auditLogs` - User action audit trail
- `scanStations` - Scan station configuration
- `products` - Product catalog

## Status Architecture

Each shipment has three independent status groups:

1. **Logistics Status** - Current position in delivery flow
2. **Payment Status** - COD/payment state
3. **Warehouse Status** - Physical stock state

## Key Flows

### Order Import → Delivery
1. CSV/API import → Order created (NEW/TO_PREPARE)
2. Warehouse preparation → NAVEX_CREATED
3. Label print → LABEL_PRINTED
4. Barcode scan → SORTED
5. Hand to Navex → HANDED_TO_NAVEX
6. In transit → IN_TRANSIT
7. Delivered → DELIVERED
8. Recette confirmed → PAID_BY_NAVEX

### Return Flow
1. Navex reports return → RETURN_IN_TRANSIT
2. Physical scan received → RETURN_RECEIVED
3. Inspection → GOOD/DAMAGED/INCOMPLETE
4. Restock (only after inspection) → RESTOCKED

## Security

- All API routes check session authentication
- Role-based permissions enforced server-side
- Navex tokens stored only in `.env.local`
- No secrets in frontend code
- Input validation via Zod
- Audit logs for sensitive operations
- Duplicate scan prevention
- Duplicate Navex shipment prevention
