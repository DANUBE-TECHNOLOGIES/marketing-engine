# MSE-DEV-001.02 — Patch Execution Engine

Ajoute la commande :

```bash
./mondescale patch <PATCH_ID>
```

Fonctions : validation du manifeste, détection des patchs déjà installés, exécution de `patch.sh`, journalisation, état persistant dans `patches/.state.json`, option `--force`.
