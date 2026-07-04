# Operations Workflows

## 1. Import Orders

**Who:** ADMIN, MANAGER

1. Navigate to Import → Commandes
2. Upload CSV or Excel file with required columns
3. System validates and shows preview
4. Import processes each row:
   - Validates phone numbers, governorates, COD amounts
   - Rejects duplicate externalOrderIds
   - Creates orders with NEW status
5. View import summary with success/failure counts
6. Download errors CSV for failed rows
7. Failed rows can be reprocessed after fixing

## 2. Prepare Packages (Warehouse)

**Who:** WAREHOUSE_OPERATOR, ADMIN, MANAGER

1. Navigate to Préparation
2. View queue of NEW/TO_PREPARE orders
3. Click "Commencer" to start preparing
4. Status changes to PREPARING
5. Pack items listed in the order
6. Click "Créer colis Navex":
   - System validates customer data
   - Calls Navex API server-side
   - Creates Shipment record with tracking code
   - Updates order to NAVEX_CREATED
7. Print label (label/barcode preview)
8. Mark as ready for scanning

## 3. Scan Station

**Who:** WAREHOUSE_OPERATOR

### Sort Mode
1. Set station to "Tri" mode
2. Scan Navex barcode
3. System validates and marks as SORTED
4. Large green/red confirmation displayed
5. Auto-focus next scan

### Handover Mode
1. Set station to "Remise Navex"
2. Scan each package
3. System marks as HANDED_TO_NAVEX
4. Timestamp recorded

### Return Receive Mode
1. Set station to "Réception retour"
2. Scan returned package barcode
3. System verifies shipment is in return status
4. Creates Return record with PENDING inspection
5. Generates inventory movement

## 4. Track Shipments

**Who:** ALL ROLES

1. Navigate to Suivi
2. View active shipments in transit
3. Manual sync: Click "Synchroniser tout"
4. Selective sync: Click "Synchro" per shipment
5. System calls Navex multi-status API
6. Status changes logged only when actually changed
7. Scheduled cron: `/api/cron/navex-sync`
8. Alerts for stuck shipments (>72h in transit)

## 5. Reconcile Recettes (Payments)

**Who:** FINANCE, ADMIN

1. Navigate to Recettes
2. Import recette CSV/Excel from Navex
3. System matches lines by Navex tracking code
4. Shows match status per line: MATCHED / UNMATCHED / DISCREPANCY
5. Review discrepancies (COD amount vs recette amount)
6. Click "Confirmer" to process:
   - Delivered lines → Payment status = PAID_BY_NAVEX
   - Return lines → Logistics = RETURN_IN_TRANSIT
   - Creates payment events
7. Undo only possible by ADMIN

## 6. Process Returns

**Who:** WAREHOUSE_OPERATOR, ADMIN

### Physical Receive
1. Receive returned package at warehouse
2. Scan barcode at scan station (return mode)
3. Verify shipment is marked as return
4. System records receipt timestamp

### Inspection
1. Inspect returned items
2. Choose status: Bon état / Endommagé / Incomplet
3. Decide whether to restock
4. System generates inventory movement
5. NEVER auto-restocks - explicit action required

### Restock
1. Only after GOOD_CONDITION inspection
2. Click restock action
3. Creates RETURN_RESTOCKED movement
4. Updates product stock levels
5. Updates warehouse status

## 7. Manage Users & Permissions

**Who:** SUPER_ADMIN, ADMIN

1. Navigate to Paramètres → Utilisateurs
2. View all users with roles and status
3. Create new user with:
   - Name, email, password
   - Role assignment
4. Roles control page access and actions:
   - SUPER_ADMIN: Everything
   - ADMIN: Operations + user mgmt
   - MANAGER: Operations view + process
   - WAREHOUSE_OPERATOR: Prep + scan + returns
   - FINANCE: Recettes + payments
   - VIEWER: Read-only dashboards

## 8. Alerts Monitoring

**Dashboard alerts trigger when:**
- Delivered >7 days but unpaid
- Returns announced >10 days not physically received
- In transit >72 hours
- Navex API errors
- Duplicate scans detected
- Incomplete customer data
