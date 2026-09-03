# MSE-25.111D — Contrat Marketing Engine → ERP

## Statut

Contrat défini, **transport désactivé**. Ce ticket ne crée aucun appel réseau vers l'ERP et ne modifie aucun flux public.

## Responsabilités

- Marketing Engine reste le producteur de la demande issue des mini-sites.
- L'ERP devient, lors d'une activation ultérieure explicite, le système de gestion commerciale de référence.
- Le lead Marketing Engine conserve son identifiant d'origine (`sourceLeadId`) pour la traçabilité.
- Une même demande ne doit jamais créer plusieurs objets ERP : la clé d'idempotence est déterministe et dérivée de la version du contrat, du système source et du `sourceLeadId`.

## Contrat v1

Version : `mse-lead-v1`

```json
{
  "contractVersion": "mse-lead-v1",
  "sourceSystem": "MARKETING_ENGINE",
  "sourceLeadId": "lead_...",
  "agency": {
    "marketingEngineAgencyId": "...",
    "siteSlug": "mondescale-gien"
  },
  "contact": {
    "name": "...",
    "email": "...",
    "phone": "..."
  },
  "project": {
    "type": "LEISURE | GROUP | BUSINESS",
    "destination": "...",
    "travelDates": "...",
    "travellers": "...",
    "budget": "...",
    "wishes": "..."
  },
  "attribution": {
    "source": "general | group | business",
    "sourcePage": "...",
    "sourcePath": "...",
    "sourceReferrer": "...",
    "utmSource": "...",
    "utmMedium": "...",
    "utmCampaign": "...",
    "utmContent": "...",
    "utmTerm": "..."
  },
  "receivedAt": "ISO-8601"
}
```

## Transport prévu lors d'un futur ticket d'activation

- Méthode : `POST`.
- Header de version : `x-mondescale-contract-version: mse-lead-v1`.
- Header d'idempotence : `idempotency-key: mse_<sha256>`.
- Authentification machine-to-machine obligatoire avant toute activation.
- Timeout borné, journalisation sans données sensibles inutiles et reprise contrôlée en cas d'échec.

## Mapping d'identité agence

Le contrat transporte à la fois `marketingEngineAgencyId` et `siteSlug`. Le récepteur ERP devra résoudre l'agence ERP de façon explicite ; aucune correspondance approximative sur le nom ou la ville n'est autorisée.

## États de synchronisation prévus

Le Marketing Engine possède déjà un état `erpSyncStatus` et les leads créés actuellement sont enregistrés en `DISABLED`. L'activation future devra définir au minimum les transitions `PENDING`, `SYNCED`, `FAILED` et conserver l'identifiant ERP retourné, sans changer rétroactivement la sémantique des leads existants.

## Garde-fous 111D

- Aucun endpoint ERP n'est appelé.
- Aucune URL ERP n'est introduite.
- Aucun secret ou token n'est introduit.
- Aucune migration SQL.
- Aucun changement du formulaire public.
- Aucun changement du rendu des mini-sites.
- Le contrat est testable isolément avec `node --test`.

## Hors périmètre

Le endpoint récepteur dans l'ERP, son modèle de données, son authentification, le transport réel, la politique de retry et l'activation production feront l'objet d'un ticket séparé après validation du contrat des deux côtés.
