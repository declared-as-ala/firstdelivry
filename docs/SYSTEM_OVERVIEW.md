# LogiFlow — Système de Gestion Logistique & COD

## ▶️ Comment lancer le projet

```bash
cd logiflow

# Installer les dépendances
npm install

# Configurer les variables d'environnement
# Copier .env.example vers .env.local et remplir les valeurs

# Lancer le serveur de développement
npm run dev

# (Optionnel) Seed la base de données avec des données de test
npm run seed
```

Le serveur démarre sur `http://localhost:3000`.

**Comptes de test** (après seed) :
| Email | Mot de passe | Rôle |
|---|---|---|
| admin@logiflow.tn | admin123 | Super Admin |
| operateur@logiflow.tn | operateur123 | Warehouse Operator |
| finance@logiflow.tn | finance123 | Finance |

---

## 1. Introduction

LogiFlow est une plateforme web de gestion logistique spécialisée dans les **commandes COD (Cash On Delivery)** expédiées via le transporteur tunisien **Navex**. Elle remplace le suivi manuel par un système numérique centralisé couvrant l'intégralité du cycle de vie d'une commande : de l'import, à la préparation, l'expédition, le suivi, la gestion des retours, et le recouvrement des recettes.

---

## 2. Stack Technique

| Couche | Technologie | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.9 |
| Langage | TypeScript | 5.x |
| Base de données | MongoDB via Mongoose | 9.7.3 |
| Authentification | next-auth | 5.0.0-beta.31 |
| Validation | Zod | 4.4.3 |
| UI | Tailwind CSS v4, shadcn/ui, Radix UI | — |
| Graphiques | Recharts | 3.9.0 |
| Tableaux | TanStack Table | 8.21.3 |
| Notifications | Sonner | 2.0.7 |
| Formulaires | react-hook-form + @hookform/resolvers | — |
| Fichiers | xlsx (import/export Excel) | 0.18.5 |

---

## 3. Architecture Générale

```
                   ┌─────────────┐
                   │   Client    │
                   │   (React)   │
                   └──────┬──────┘
                          │
              ┌───────────┴───────────┐
              │    Next.js App Router  │
              │  (Pages + API Routes)  │
              └───────────┬───────────┘
                          │
              ┌───────────┴───────────┐
              │    next-auth (v5)     │
              │    Credentials Auth   │
              └───────────┬───────────┘
                          │
              ┌───────────┴───────────┐
              │   MongoDB / Mongoose  │
              │    (17 collections)   │
              └───────────────────────┘
                          │
              ┌───────────┴───────────┐
              │ Navex API (externe)   │
              │  Mock mode disponible  │
              └───────────────────────┘
```

### Flux de données typique

1. **Import** : Les commandes sont importées via fichier Excel (ou via l'API UI)
2. **Préparation** : Les opérateurs préparent les colis (emballage, étiquetage)
3. **Scan** : Chaque colis est scanné à chaque étape (tri, remise Navex, réception retour)
4. **Expédition** : Les colis sont transmis à Navex via l'API
5. **Suivi** : Le statut Navex est synchronisé périodiquement
6. **Recettes** : Navex reverse les montants COD, l'admin confirme les recettes
7. **Retours** : Les colis non livrés sont réceptionnés, inspectés, et réintégrés au stock

---

## 4. Structure du Projet

```
logiflow/
├── src/
│   ├── app/
│   │   ├── (auth)/login/         # Page de connexion
│   │   ├── (dashboard)/          # Pages protégées
│   │   │   ├── dashboard/        # Tableau de bord principal
│   │   │   ├── orders/           # Gestion des commandes
│   │   │   ├── preparation/      # Préparation des colis
│   │   │   ├── scan/             # Station de scan
│   │   │   ├── shipments/        # Expéditions Navex
│   │   │   ├── tracking/         # Suivi colis
│   │   │   ├── recettes/         # Recettes COD
│   │   │   ├── returns/          # Retours colis
│   │   │   ├── inventory/        # Gestion de stock
│   │   │   ├── imports/orders/   # Import Excel
│   │   │   ├── analytics/        # Analytique
│   │   │   ├── settings/         # Paramètres
│   │   │   └── settings/users/   # Gestion utilisateurs
│   │   ├── api/                  # 21 routes API
│   │   └── layout.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── dashboard-layout.tsx  # Layout avec sidebar
│   │   │   └── sidebar.tsx          # Sidebar premium
│   │   └── ui/                   # Composants shadcn/ui
│   └── lib/
│       ├── models/               # 17 modèles Mongoose
│       ├── navex/                # Service Navex (client, types, mapper, statuts)
│       ├── validators/           # Schémas Zod
│       ├── data/                 # Données statiques (gouvernorats)
│       ├── utils/                # Fonctions utilitaires
│       ├── auth.ts               # Configuration next-auth v5
│       ├── db.ts                 # Connexion MongoDB
│       └── permissions.ts        # Système RBAC
├── scripts/
│   └── seed.ts                   # Script d'initialisation BDD
└── docs/                         # Documentation
```

---

## 5. Modèle de Données (17 collections)

### 5.1 Entités Principales

| Modèle | Collection | Description |
|---|---|---|
| **User** | users | Authentification, RBAC (6 rôles) |
| **Order** | orders | Commandes clients avec montant COD, adresse, articles |
| **Shipment** | shipments | Expéditions envoyées via Navex |
| **ShipmentEvent** | shipevents | Historique des événements de statut Navex |
| **ShipmentScan** | shipmentscans | Scans effectués sur les colis |
| **Product** | products | Catalogue produits référencés |
| **Return** | returns | Colis retournés (non livrés) |
| **ReturnInspection** | returninspections | Inspection détaillée des retours |
| **RecetteBatch** | recettebatches | Lots de recettes COD confirmés |
| **RecetteLine** | recettelines | Lignes individuelles de recettes |
| **InventoryMovement** | inventorymoves | Mouvements de stock |
| **ImportBatch** | importbatches | Lots d'import fichiers |
| **ImportRow** | importrows | Lignes d'import individuelles |
| **NavexApiLog** | navexapilogs | Journalisation des appels API Navex |
| **SystemSetting** | systemsettings | Configuration système |
| **AuditLog** | auditlogs | Journal d'audit |
| **ScanStation** | scanstations | Configuration des postes de scan |

### 5.2 Relations clés

```
Order ──1:N──> Shipment
Shipment ──1:N──> ShipmentEvent
Shipment ──1:N──> ShipmentScan
Order ──1:1──> Return
Return ──1:N──> ReturnInspection
RecetteBatch ──1:N──> RecetteLine
ImportBatch ──1:N──> ImportRow
Order ──N:M──> Product (via items[])
```

### 5.3 Statuts (3 dimensions indépendantes)

Chaque expédition a **3 groupes de statuts indépendants** :

| Groupe | Statuts possibles |
|---|---|
| **Logistique** | `preparation`, `ready`, `handed_over`, `in_transit`, `delivered`, `returned`, `lost` |
| **Paiement** | `pending`, `collected`, `settled`, `released`, `failed` |
| **Entrepôt** | `pending`, `picking`, `packed`, `shipped`, `received_back` |

---

## 6. Authentification & RBAC

### 6.1 next-auth v5 Credentials Provider

- Connexion par email + mot de passe (hashé avec bcryptjs)
- Session JWT stockée en cookie (httpOnly)
- L'utilisateur est chargé depuis MongoDB avec son rôle et ses permissions

### 6.2 Rôles (hiérarchiques)

| Rôle | Niveau | Accès |
|---|---|---|
| **SUPER_ADMIN** | 100 | Tout |
| **ADMIN** | 80 | Tout sauf supprimer |
| **MANAGER** | 60 | Opérations, rapports |
| **WAREHOUSE_OPERATOR** | 40 | Scan, préparation, stock |
| **FINANCE** | 30 | Recettes, analytique |
| **VIEWER** | 10 | Lecture seule |

### 6.3 Permissions granulaires

```typescript
const permissions = {
  orders: { view: [...], create: [...], update: [...], delete: ["SUPER_ADMIN"] },
  shipments: { view: [...], create: [...], sync: ["SUPER_ADMIN","ADMIN"] },
  scans: { create: ["SUPER_ADMIN","ADMIN","MANAGER","WAREHOUSE_OPERATOR"] },
  recettes: { confirm: ["SUPER_ADMIN","ADMIN","FINANCE"] },
  returns: { inspect: ["SUPER_ADMIN","ADMIN","MANAGER","WAREHOUSE_OPERATOR"] },
  inventory: { adjust: ["SUPER_ADMIN","ADMIN","MANAGER","WAREHOUSE_OPERATOR"] },
  settings: { view: ["SUPER_ADMIN","ADMIN","MANAGER"], update: ["SUPER_ADMIN","ADMIN"] },
  users: { manage: ["SUPER_ADMIN","ADMIN"] },
  analytics: { view: ["SUPER_ADMIN","ADMIN","MANAGER","FINANCE","VIEWER"] },
}
```

---

## 7. Intégration Navex

### 7.1 Architecture

```
LogiFlow ──── API Navex (HTTPS) ────> Navex
              (4 tokens différents)
```

Le service Navex se trouve dans `src/lib/navex/` :

| Fichier | Rôle |
|---|---|
| `navex-client.ts` | Client HTTP avec 4 méthodes (create, status, multi-status, delete) |
| `types.ts` | Types TypeScript pour les payloads/réponses Navex |
| `shipment-mapper.ts` | Mapping Order → payload Navex |
| `status-mapper.ts` | Mapping statuts Navex → statuts internes |
| `errors.ts` | Gestion d'erreurs et codes d'erreur |

### 7.2 Endpoints Navex

| Méthode | Endpoint (supposé) | Token requis |
|---|---|---|
| `createShipment()` | `/api/create-shipment` | Création |
| `getStatus()` | `/api/status` | Statut |
| `getMultiStatus()` | `/api/multi-status` | Multi-statut |
| `deleteShipment()` | `/api/delete` | Suppression |

> ⚠️ Ces endpoints sont **non confirmés** — ils reflètent la compréhension actuelle de l'API Navex.

### 7.3 Mock Mode

Si les tokens Navex ne sont pas configurés dans `.env.local`, le système fonctionne en **mock mode** :
- Les appels API sont simulés avec des réponses réalistes
- Tous les appels sont journalisés dans `NavexApiLog` pour inspection
- Une page de test (`/api/navex/test`) permet de visualiser et tester les appels

---

## 8. Pages et Fonctionnalités

### 8.1 Page de Connexion (`/login`)
- Fond sombre avec dégradés animés et orbes lumineuses
- Carte en verre (glassmorphism) avec icône de marque brillante
- Validation Zod du formulaire
- Icône œil pour afficher/masquer le mot de passe
- Animation d'entrée fluide

### 8.2 Tableau de Bord (`/dashboard`)
- Statistiques clés : commandes actives, colis en transit, montant COD total, retours
- Graphiques d'évolution (Recharts)
- Alertes et notifications
- Vue rapide des dernières activités

### 8.3 Commandes (`/orders`)
- Liste complète avec filtres (statut, date, client, gouvernorat)
- Tableau triable avec TanStack Table
- Détail d'une commande (`/orders/[id]`) :
  - Informations client et adresse
  - Articles commandés
  - Statut logistique / paiement / entrepôt
  - Historique des scans
- Import de commandes via fichier Excel

### 8.4 Préparation (`/preparation`)
- Vue des commandes à préparer
- Opérateurs assignent des colis
- Impression d'étiquettes

### 8.5 Station de Scan (`/scan`)
- **Interface plein écran immersive** conçue pour un environnement d'entrepôt
- **3 modes de scan** avec sélecteur à glissière :
  - **Tri** (SORT) : trier les colis par zone de livraison
  - **Remise Navex** (HANDOVER_TO_NAVEX) : transfert au transporteur
  - **Réception retour** (RETURN_RECEIVE) : colis retournés
- Scan par **code-barres** (détection automatique du `\n` terminal) ou **saisie manuelle**
- Résultat visuel immédiat avec animation (succès vert/échec rouge)
- Barre lumineuse animée sur le résultat
- **Panneau latéral des scans récents** :
  - Liste déroulante avec animations d'entrée
  - Statistiques (réussis/échoués)
  - Affichage du montant COD pour chaque scan réussi
- Barre de chargement animée pendant le traitement
- Auto-focus permanent sur le champ de scan

### 8.6 Expéditions (`/shipments`)
- Liste des colis envoyés à Navex
- Création d'expédition depuis une commande
- Synchronisation manuelle des statuts Navex
- Impression des documents d'expédition

### 8.7 Suivi (`/tracking`)
- Carte des colis en transit
- Filtres par statut et transporteur
- Timeline des événements par colis

### 8.8 Recettes (`/recettes`)
- Confirmation des montants COD reçus
- Création de lots de recettes
- Validation et clôture comptable

### 8.9 Retours (`/returns`)
- Réception des colis retournés
- Inspection détaillée (état colis, articles manquants)
- Réintégration au stock ou mise au rebut

### 8.10 Stock (`/inventory`)
- Vue des niveaux de stock par produit
- Mouvements d'inventaire
- Alertes de stock bas

### 8.11 Import (`/imports/orders`)
- Import de commandes via fichier Excel
- Validation des données importées
- Suivi des lots d'import

### 8.12 Analytique (`/analytics`)
- Graphiques d'évolution des ventes
- Performance Navex (délais de livraison)
- Taux de retour par produit
- Statistiques COD (montants, délais de règlement)

### 8.13 Paramètres (`/settings`)
- Configuration système (mock mode, tokens Navex)
- Gestion des utilisateurs (`/settings/users`)
- Logs API Navex (`/api/navex/logs`)
- Test API Navex (`/api/navex/test`)

---

## 9. Sidebar Premium

- **Fond glassmorphique** avec arrière-plan flou et lueur ambiante
- **En-tête de marque dégradé** avec icône brillante et ombre portée
- **Navigation animée** : les éléments apparaissent avec un décalage progressif (stagger)
- **Indicateur actif** : barre latérale gauche dégradée + fond en surbrillance
- **Badge "Live"** animé sur l'élément Scan
- **Section utilisateur** : avatar avec anneau dégradé, nom et rôle
- **Collapse/Expand** fluide avec icônes de chevron
- **Déconnexion** avec effet de survol rouge

---

## 10. API Routes (21 endpoints)

| Route | Méthode | Description |
|---|---|---|
| `/api/auth/[...nextauth]` | * | Authentification next-auth |
| `/api/orders` | GET | Liste des commandes |
| `/api/orders/[id]` | GET | Détail d'une commande |
| `/api/orders/import` | POST | Import de commandes |
| `/api/shipments` | GET | Liste des expéditions |
| `/api/shipments/create-from-order` | POST | Créer expédition depuis une commande |
| `/api/shipments/create-navex` | POST | Envoyer à Navex |
| `/api/shipments/sync-status` | POST | Synchroniser statuts Navex |
| `/api/shipments/[id]` | GET | Détail expédition |
| `/api/shipments/[id]/print` | GET | Impression |
| `/api/scans` | POST | Enregistrer un scan |
| `/api/returns` | GET | Liste des retours |
| `/api/recettes/confirm` | POST | Confirmer un lot de recettes |
| `/api/inventory/movements` | POST | Mouvement de stock |
| `/api/navex/test` | GET | Test API Navex |
| `/api/navex/logs` | GET | Logs des appels API |
| `/api/navex/status` | GET | Statut de l'intégration Navex |
| `/api/cron/sync` | POST | Synchronisation automatique (cron) |
| `/api/users` | GET/POST | Gestion utilisateurs |
| `/api/settings` | GET/PUT | Paramètres système |
| `/api/dashboard/stats` | GET | Statistiques tableau de bord |

---

## 11. Validation avec Zod v4

Tous les schémas de validation sont dans `src/lib/validators/` :

- `order-schema.ts` : validation commande (adresse, articles, montants)
- `shipment-schema.ts` : validation expédition
- `settings-schema.ts` : validation configuration
- `user-schema.ts` : validation utilisateur
- `scan-schema.ts` : validation scan
- Return, recette, inventaire, etc.

Zod v4 est utilisé avec sa nouvelle API (tableau d'erreurs, `errorMap` retiré).

---

## 12. Design System

### Palette
- **Fond principal** : `#07080a` (noir profond)
- **Fond carte** : `#0e1015` avec `backdrop-blur-xl`
- **Bordure** : `white/[0.06]` (très subtile)
- **Accent** : Dégradé `blue-500 → indigo-600`
- **Succès** : `green-400/500`
- **Erreur** : `red-400/500`
- **Texte primaire** : `white`
- **Texte secondaire** : `white/40-60`

### Effets
- Glassmorphism : `bg-white/[0.03] backdrop-blur-xl`
- Glow : `blur-xl` + `shadow-lg shadow-blue-500/20`
- Bordures fines : `border border-white/[0.06]`
- Animations : `transition-all duration-300/500/700`
- Hover : `hover:bg-white/[0.04]`

---

## 13. Script de Seed

Le script `scripts/seed.ts` initialise la base de données avec :

- **5 utilisateurs** (1 SUPER_ADMIN, 1 ADMIN, 1 MANAGER, 1 WAREHOUSE_OPERATOR, 1 FINANCE)
- **40 commandes** avec adresses dans différents gouvernorats tunisiens
- **Expéditions Navex** associées
- **Scans** historiques
- **Événements de statut**
- **Retours** et inspections
- **Lot de recettes** avec lignes
- **Produits** divers

---

## 14. Design Premium (pages clés)

### Login page
- Arrière-plan avec 3 orbes animées (pulse, spin)
- Grille subtile en superposition
- Carte en verre avec lueur de bordure dégradée
- Icône de marque avec halo lumineux
- Champs avec effet de focus lumineux
- Bouton connecter avec icône de flèche

### Scan Station
- Arrière-plan avec orbes animées et grille
- Sélecteur de mode avec indicateur coulissant
- Champ de scan avec halo néon animé
- Résultat avec barre de progression lumineuse
- Animations micro-interactions (scale, bounce)
- Panneau latéral coulissant avec statistiques

### Sidebar
- Verre dépoli avec lueur ambiante
- Logo dégradé avec ombre
- Navigation avec animation staggered
- Indicateur actif avec barre latérale
- Badge Live avec point pulsant
- Avatar avec anneau dégradé
