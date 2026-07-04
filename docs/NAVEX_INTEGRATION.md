# Navex Integration Guide

## Overview

LogiFlow integrates with [Navex](https://app.navex.tn) for COD shipment management in Tunisia. The integration handles shipment creation, status tracking, and payment reconciliation.

## Architecture

All Navex API calls are made server-side only. API tokens are stored in `.env.local` and never exposed to the browser.

```
src/lib/navex/
  navex-client.ts          # Main Navex service class
  navex.types.ts           # TypeScript interfaces for Navex API
  navex.mapper.ts          # Maps internal order data to Navex payload
  navex-status.mapper.ts   # Maps Navex status strings to internal statuses
  navex.errors.ts          # Custom error classes for Navex operations
```

## Confirmed Endpoint

### Create Shipment

| Property | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `https://app.navex.tn/api/{NAVEX_CREATE_TOKEN}/v1/post.php` |
| **Content-Type** | `application/x-www-form-urlencoded` |
| **Token** | Embedded in URL path (not as query parameter) |

The `NAVEX_CREATE_TOKEN` is configured via the `NAVEX_CREATE_TOKEN` environment variable.

### Request Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `prix` | string (3 decimals) | ✅ | Montant COD (ex: `150.000`) |
| `nom` | string | ✅ | Nom complet du client |
| `gouvernerat` | string | ✅ | Gouvernorat de livraison |
| `ville` | string | ✅ | Ville de livraison |
| `adresse` | string | ✅ | Adresse complète |
| `tel` | string | ✅ | Numéro de téléphone |
| `tel2` | string | ❌ | Téléphone secondaire |
| `designation` | string | ✅ | Description des articles |
| `nb_article` | string | ✅ | Nombre total d'articles |
| `msg` | string | ❌ | Note / instruction de livraison |
| `echange` | string | ❌ | Autoriser échange (`0` ou `1`) |
| `article` | string | ❌ | Article pour échange |
| `nb_echange` | string | ❌ | Nombre d'articles pour échange |
| `ouvrir` | string | ❌ | Autoriser ouverture (`0` ou `1`) |
| `sender_name` | string | ✅ | Nom de l'expéditeur |
| `sender_location` | string | ✅ | Localisation de l'expéditeur |
| `sender_gouvernorat` | string | ✅ | Gouvernorat de l'expéditeur |

### Response

```json
{
  "success": true,
  "tracking_code": "NVX-XXXXXX",
  "shipment_reference": "REF-XXXXXX",
  "message": "Colis créé avec succès"
}
```

## Status & Tracking Endpoints ⚠️

**Ces endpoints ne sont pas encore confirmés par Navex.**

Les méthodes de suivi (`getShipmentStatus`, `getMultipleShipmentStatuses`, `deleteShipment`) fonctionnent en **mode simulé (mock)** par défaut.

Pour les activer en mode réel :
1. Obtenez les URLs exactes auprès de Navex
2. Configurez-les via **Paramètres → Intégration Navex** dans l'interface LogiFlow
3. Les URLs sont stockées en base de données (`SystemSetting`) :
   - `navexStatusEndpoint` — Endpoint pour le statut d'un seul colis
   - `navexMultiStatusEndpoint` — Endpoint pour les statuts multiples
   - `navexDeleteEndpoint` — Endpoint pour supprimer un colis

Tant que ces URLs ne sont pas configurées, toutes les requêtes de statut retournent des réponses simulées.

## Configuration

### Variables d'environnement (`.env.local`)

```env
# Requis pour le mode réel
NAVEX_CREATE_TOKEN=mzalitiktot-VF6WRJNA12VODLO2LTZ3EPO5NKUKOUBO

# Informations expéditeur
NAVEX_SENDER_NAME=LogiFlow
NAVEX_SENDER_LOCATION=Tunis
NAVEX_SENDER_GOUVERNORAT=Tunis
```

### Configuration dans l'UI

Rendez-vous sur **Paramètres → Intégration Navex** pour :
- Configurer les endpoints de suivi (status, multi-status, delete)
- Tester la connexion à l'API Navex
- Consulter les logs des appels API

## Mock Mode

Le système bascule automatiquement en **mode simulé (mock)** lorsque :
- `NAVEX_CREATE_TOKEN` n'est pas défini ou est égal à `YOUR_CREATE_TOKEN_HERE`
- Les endpoints de suivi ne sont pas configurés dans la base de données

En mode mock :
- La création de colis génère un faux code de suivi (`NVX-xxxxxx`)
- Les requêtes de statut retournent "En cours d'acheminement"
- Tous les appels sont journalisés dans `NavexApiLog`
- Aucun appel réel n'est fait à Navex

## Status Mapping

La correspondance entre les statuts Navex et les statuts internes est définie dans `navex-status.mapper.ts` :

| Navex Status | Logistique | Paiement | Entrepôt |
|---|---|---|---|
| `en_attente` | `NAVEX_CREATED` | `COD_EXPECTED` | `PACKED` |
| `pris_en_charge` | `HANDED_TO_NAVEX` | — | `OUT_OF_WAREHOUSE` |
| `en_cours` | `IN_TRANSIT` | — | — |
| `en_cours_livraison` | `OUT_FOR_DELIVERY` | — | — |
| `livre` | `DELIVERED` | `DELIVERED_UNPAID` | — |
| `livre_non_paye` | `DELIVERED` | `DELIVERED_UNPAID` | — |
| `retour` | `RETURN_IN_TRANSIT` | — | `RETURN_EXPECTED` |
| `retour_recu` | `RETURN_RECEIVED` | — | `RETURN_RECEIVED` |
| `annule` | `CANCELLED` | `NOT_APPLICABLE` | — |
| `refuse` | `RETURN_IN_TRANSIT` | — | `RETURN_EXPECTED` |
| `non_distribuable` | `EXCEPTION` | — | — |
| `adresse_incomplete` | `EXCEPTION` | — | — |
| `client_absent` | `EXCEPTION` | — | — |
| `reporte` | `EXCEPTION` | — | — |

## Payment Reconciliation (Recettes)

Quand un lot de recettes est confirmé :
1. Lignes "Livré" → Statut paiement passe à `PAID_BY_NAVEX`
2. Lignes "Retour" → Statut logistique passe à `RETURN_IN_TRANSIT` si pas déjà reçu
3. Les écarts entre le COD attendu et le montant de la recette sont signalés
4. Les lignes non appairées restent en réconciliation manuelle

## Testing

1. Configurez le token `NAVEX_CREATE_TOKEN` dans `.env.local`
2. Créez une commande via Import ou l'interface
3. Allez dans **Préparation → Créer colis Navex**
4. Vérifiez la réponse avec le code de suivi
5. Scannez le code dans la **Station de Scan**
6. Testez la création de recettes et la confirmation

## Troubleshooting

- Consultez les logs API Navex dans **Paramètres → Logs API**
- Utilisez le bouton **Tester la connexion** dans Paramètres
- Vérifiez que tous les champs obligatoires sont présents dans les données client
- Les numéros de téléphone doivent être au format tunisien (`+216XXXXXXXX`)
- En cas d'erreur 401/403, vérifiez que votre token Navex est valide
- Si la création échoue, activez le mode mock pour isoler le problème
