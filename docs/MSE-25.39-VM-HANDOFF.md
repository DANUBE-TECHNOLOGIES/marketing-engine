# MSE-25.39 — Handoff VM Flexible Payment

Ce document décrit les seules opérations restantes après validation CI de la branche `feature/mse-25-39-flexible-payment-vm-handoff`.

## 1. Synchroniser le code

Depuis la racine du repository sur la VM :

```bash
git fetch origin
git switch feature/mse-25-39-flexible-payment-vm-handoff
git pull --ff-only origin feature/mse-25-39-flexible-payment-vm-handoff
git status
```

Le worktree doit être propre avant de poursuivre.

## 2. Installer les dépendances et générer Prisma

```bash
cd backend
npm ci
npm run prisma:generate
```

## 3. Appliquer la migration de production

Ne pas utiliser `prisma migrate dev` sur la VM. Appliquer les migrations versionnées :

```bash
npx prisma migrate deploy
```

La migration MSE-25.32 doit créer la table `AgencyPaymentPolicy` sans modifier les policies existantes d'autres modules.

## 4. Contrôler le runtime avant redémarrage

```bash
npm run mse-25.39:vm-readiness
```

Le JSON doit retourner :

```json
{
  "version": "mse-25.39",
  "ready": true,
  "readOnly": true,
  "writes": false
}
```

Le contrôle échoue volontairement si PostgreSQL est inaccessible, si `AgencyPaymentPolicy` n'existe pas ou si un export runtime attendu manque.

## 5. Redémarrer le backend

Utiliser le mécanisme de redémarrage déjà en place sur la VM (systemd, Docker Compose ou autre mécanisme d'exploitation existant). Aucun nom de service n'est imposé par MSE-25.39.

## 6. Contrôler l'API

Après redémarrage :

```bash
curl -fsS http://127.0.0.1:<PORT_BACKEND>/api/flexible-payment/operational-status | jq
```

Le résultat attendu contient `ok: true`, `readOnly: true`, `writes: false`, un `fingerprint`, un `summary` et la liste `sites`.

Puis contrôler une agence connue :

```bash
curl -fsS http://127.0.0.1:<PORT_BACKEND>/api/agency-sites/<SITE_SLUG>/flexible-payment | jq
```

## 7. Validation Website Designer V2

Dans l'éditeur d'un mini-site :

1. ouvrir le panneau Paiement en plusieurs fois ;
2. conserver la policy désactivée tant que les paramètres commerciaux de l'agence ne sont pas validés ;
3. renseigner explicitement les produits concernés, les échéances autorisées, le mode de frais et le disclaimer ;
4. sauvegarder la policy avec confirmation ;
5. contrôler le preview ;
6. appliquer seulement après validation du contenu affiché.

Aucune agence non configurée n'hérite automatiquement d'une promesse financière.

## 8. Contrôle public

Après un apply volontaire :

- vérifier le bloc compact de la home si prévu ;
- vérifier le bloc enrichi de la page billetterie/vols si elle existe et est publiée ;
- vérifier le CTA ;
- vérifier qu'aucune mention `sans frais`, `3x`, `4x` ou autre échéance n'apparaît si elle n'est pas explicitement configurée ;
- vérifier l'événement `mondescale_conversion` au clic CTA si le tag manager est présent.

## 9. Retour arrière

Le rollback unitaire reste disponible via l'API MSE-25.32. Les couches MSE-25.35 à MSE-25.37 apportent en complément preview réseau, reçu d'audit et rollback réseau scellé. Ne jamais supprimer manuellement un bloc généré si un rollback versionné est disponible.

## État attendu après handoff

Une fois ces contrôles passés, la fonctionnalité Flexible Payment est exploitable. Les étapes suivantes sont des opérations de configuration commerciale par agence et de déploiement volontaire, pas du développement logiciel.
