# LogiFlow — Refactor « Navex Parcel Control » (Phase 1 : Logique)

Ce document récapitule la simplification de LogiFlow en une plateforme de **contrôle
des colis Navex**. Phase 1 = logique métier + API (terminée et testée). Phase 2 =
refonte visuelle (thème clair) — à venir.

---

## 1. Nouvelle sidebar (8 entrées exactement)

| # | Libellé | Route | État |
|---|---|---|---|
| 1 | Dashboard | `/dashboard` | ✅ reconstruit (thème clair) — cartes + alertes |
| 2 | Colis | `/colis` | ✅ créé — table + import CSV/Excel + historique |
| 3 | Scanner | `/scan` | ✅ reconstruit — 3 modes, compteur lot, son, override |
| 4 | Lots Navex | `/batches` | ✅ reconstruit — création, compteurs, remise + dérogation |
| 5 | Suivi Navex | `/suivi` | ✅ créé — filtres + bouton synchroniser |
| 6 | Retours | `/returns` | ✅ reconstruit — annoncés vs confirmés |
| 7 | Recettes | `/recettes` | ✅ reconstruit — 4 groupes + import recette |
| 8 | Paramètres | `/settings` | ✅ simplifié — config + profil + effacer démo |

Toutes les pages sont en **thème clair** (fond clair, cartes blanches, accent bleu marine,
vert = validé/livré, orange = en attente, rouge = problème ; sans glassmorphism ni effets
lumineux). Sidebar et `globals.css` également en thème clair.

> La sidebar (`src/components/layout/sidebar.tsx`) ne contient plus que ces 8 entrées.

---

## 2. Fonctionnalités SUPPRIMÉES (pages + API + modèles)

**Pages supprimées :** Préparation, Stock/Inventaire, Analytique, Intégration Ecommerce,
Confirmations, Imports (ancienne section), Commandes (`/orders`), Expéditions (`/shipments`),
Suivi livraison (`/tracking` — remplacé par `/suivi`), sous-dashboards
(financial / operational / warehouse), Utilisateurs & rôles, Intégration Ecommerce (settings).

**Routes API supprimées :** `api/shipments/*`, `api/orders/*`, `api/webhooks/*`,
`api/inventory/*`, `api/confirmations`, `api/dashboard/{financial,operational,warehouse}`,
`api/returns/[id]/{inspect,receive}`, `api/recettes/[id]/*`, `api/settings/ecommerce`.

**Modèles Mongoose supprimés :** `Shipment`, `ShipmentEvent`, `ShipmentScan`, `Return`,
`ReturnInspection`, `Product`, `InventoryMovement`, `EcommerceWebhook`, `ScanStation`,
`ImportRow`. Également supprimé : `navex.mapper.ts` (création de shipment, devenue inutile).

**Modèles conservés :** `Order` (= Colis), `OutboundBatch`, `ParcelScan` (nouveau),
`RecetteBatch`, `RecetteLine`, `ImportBatch`, `User`, `SystemSetting`, `NavexApiLog`, `AuditLog`.

---

## 3. Nouveau modèle de statut (champs base de données)

Le colis (`Order`) porte 3 dimensions indépendantes :

```
physicalStatus : IMPORTED | SCANNED_READY | HANDED_TO_NAVEX | RETURN_EXPECTED | RETURN_CONFIRMED
navexStatus    : PENDING | IN_TRANSIT | OUT_FOR_DELIVERY | DELIVERED | RETURN | UNKNOWN
paymentStatus  : COD_EXPECTED | DELIVERED_UNPAID | PAID_BY_NAVEX | PAYMENT_DISPUTE
```

Champs clés : `externalOrderId` (unique), `navexTrackingCode` (unique, requis),
`navexLabelUrl`, `productSummary`, `codAmount`, `outboundBatchId`, `importBatchId`,
horodatages (`scannedReadyAt`, `handedToNavexAt`, `deliveredAt`, `paidAt`,
`returnExpectedAt`, `returnConfirmedAt`), `paidAmount`, `recetteNumber`.

Transitions automatiques :
- Scan avant remise → `SCANNED_READY`
- Remise du lot → `HANDED_TO_NAVEX`
- Navex `DELIVERED` → paiement `DELIVERED_UNPAID`
- Recette confirmée → `PAID_BY_NAVEX` (ou `PAYMENT_DISPUTE` si écart)
- Navex `RETURN` → `RETURN_EXPECTED` (annonce uniquement)
- Scan retour physique → `RETURN_CONFIRMED`

---

## 4. Modèle d'import des colis (CSV / Excel)

Bouton « Importer colis Navex » (page Colis). Colonnes (`docs/templates/parcels-template.csv`) :

```
externalOrderId, customerName, phone, governorate, city, address,
codAmount, productSummary, navexTrackingCode, navexLabelUrl, navexCreatedAt
```

Règles : `navexTrackingCode` et `externalOrderId` requis ; pas de doublon (fichier + base) ;
aperçu avant import ; lignes invalides listées avec l'erreur exacte ; aucune création de
colis fictif.

API : `POST /api/parcels/import` (`mode=preview` puis `mode=commit`), historique via `GET`.

---

## 5. Modèle d'import des recettes (CSV / Excel)

Colonnes (`docs/templates/recette-template.csv`) :

```
navexTrackingCode, navexStatus, amount, deliveryDate, recipeNumber
```

Règles (`POST /api/recettes/import`) :
- Statut livré + montant = COD → `PAID_BY_NAVEX`
- Statut livré + montant ≠ COD → `PAYMENT_DISPUTE`
- Statut retour → jamais payé ; force `RETURN_EXPECTED` (jamais confirmé)

---

## 6. Lancer l'application SANS données de démonstration

```bash
cd logiflow
npm install
# .env.local : MONGODB_URI, NEXTAUTH_SECRET, (tokens Navex optionnels → mock mode)
npm run seed       # crée UNIQUEMENT les 3 comptes, AUCUN colis/démo
npm run dev
```

Comptes créés : `admin@logiflow.tn / admin123`, `operateur@logiflow.tn / operateur123`,
`finance@logiflow.tn / finance123`.

Base vide → état vide propre attendu :
> « Aucun colis importé. Importez les colis Navex ou synchronisez-les depuis votre ecommerce. »

---

## 7. Supprimer d'anciennes données de seed / démo

```bash
npm run reset                # supprime TOUTES les données opérationnelles (garde users + settings)
npm run reset -- --demo-only # supprime uniquement les enregistrements isDemo: true
```

Action admin équivalente : `POST /api/admin/clear-demo-data` (SUPER_ADMIN / ADMIN).

---

## 8. Plus aucun enregistrement fictif `#SCAN-*`

L'ancienne route de scan créait des commandes `SCAN-<code>` / `Client <code>` / `+21600000000`
quand un code était inconnu. **Ce comportement est supprimé.** La nouvelle route
`POST /api/scans` est en lecture seule sur la base : un code inconnu renvoie
« Code Navex introuvable » et n'écrit jamais de colis. Le seed ne génère plus aucune
commande. → Aucun `#SCAN-*` ne peut plus être créé.

---

## 9. Vérification

- `npm run typecheck` → 0 erreur de source.
- `npm run test:scenario` → **17/17** (voir `docs/700-PARCEL-TEST-REPORT.md`).
