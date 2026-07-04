# Rapport de test — Scénario 700 colis (spec §10)

**Date d'exécution :** 2026-06-30
**Commande :** `npm run test:scenario`
**Base de données :** `logiflow_test` (base isolée, ne touche jamais les données réelles)
**Moteur testé :** `src/lib/scan-engine.ts` (le même code que la route `POST /api/scans`)

## Résultat global

```
RÉSULTAT : 17 réussis, 0 échoués ✅
```

## Détail par étape

| Étape | Vérification | Attendu | Obtenu | Statut |
|---|---|---|---|---|
| 1. Import | Colis importés | 700 | 700 | ✅ |
| 1. Import | Codes Navex uniques | 700 | 700 | ✅ |
| 2. Lot | Colis assignés au lot | 700 | 700 | ✅ |
| 3. Scan | Colis `SCANNED_READY` | 700 | 700 | ✅ |
| 3. Scan | Re-scan rejeté (`Colis déjà scanné`) | bloqué | bloqué | ✅ |
| 4. Remise | Manquants à la remise | 0 | 0 | ✅ |
| 4. Remise | Colis `HANDED_TO_NAVEX` | 700 | 700 | ✅ |
| 5/6. Sync | Livrés | 500 | 500 | ✅ |
| 5/6. Sync | Livrés non payés | 500 | 500 | ✅ |
| 5/6. Sync | Retours annoncés | 200 | 200 | ✅ |
| 5/6. Sync | Retours confirmés physiquement | 0 | 0 | ✅ |
| 7/8. Recette | Payés par Navex | 400 | 400 | ✅ |
| 7/8. Recette | Livrés non payés restants | 100 | 100 | ✅ |
| 11. Retours | Retours annoncés (inchangé) | 200 | 200 | ✅ |
| 11. Retours | Retours confirmés physiquement | 180 | 180 | ✅ |
| 11. Retours | Retours encore attendus | 20 | 20 | ✅ |
| 11. Retours | Retour non annoncé → bloqué | bloqué | bloqué | ✅ |

## Règles métier prouvées

- **Aucune création de colis par scan** — un code inconnu renvoie « Code Navex introuvable ».
- **Livré ≠ Payé** — un colis livré reste `DELIVERED_UNPAID` tant qu'aucune recette ne le marque `PAID_BY_NAVEX`.
- **Retour annoncé ≠ Retour confirmé** — `navexStatus = RETURN` met le colis en `RETURN_EXPECTED` ;
  seul un scan physique le passe en `RETURN_CONFIRMED`.
- **« Retours attendus » reste à 200** même après confirmation physique (compte les annonces Navex),
  tandis que « encore attendus » descend à 20.
- **Double scan bloqué** et **retour non annoncé bloqué** (sauf override superviseur).
