# Rotation des accès externes

Les secrets Google et DataForSEO ont auparavant été enregistrés directement
dans la configuration Docker. Ils sont maintenant chargés depuis le fichier
`.env`, mais doivent encore être renouvelés depuis les consoles fournisseurs.

## Google Business Profile

1. Créer un nouveau secret pour le client OAuth utilisé par Local Engine.
2. Conserver l'URI de redirection :
   `https://localengine.mondescale.com/api/google/callback`.
3. Remplacer `GOOGLE_CLIENT_SECRET` dans `.env`.
4. Recréer les services backend et frontend.
5. Vérifier `/google/token-status` puis `/google/accounts`.
6. Supprimer l'ancien secret uniquement après ces vérifications.

La rotation du secret OAuth peut imposer une nouvelle connexion Google afin
d'obtenir un refresh token valide.

## DataForSEO

1. Générer ou renouveler les identifiants API dans le compte DataForSEO.
2. Remplacer `DATAFORSEO_LOGIN` et `DATAFORSEO_PASSWORD` dans `.env`.
3. Recréer le backend.
4. Vérifier `/dataforseo/status` puis exécuter un contrôle de classement limité.
5. Révoquer les anciens identifiants après validation.

## Règles

- Ne jamais placer de secret dans Git, un fichier source ou une conversation.
- Conserver `.env` avec les permissions `600`.
- Faire une sauvegarde avant chaque rotation.
- Renouveler un fournisseur à la fois et vérifier le service avant de poursuivre.
