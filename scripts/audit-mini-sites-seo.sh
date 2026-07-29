#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="docs/audits/mini-sites-seo-audit-${STAMP}.txt"
LATEST="docs/audits/latest-mini-sites-seo-audit.txt"

section() {
  printf '\n\n============================================================\n'
  printf '%s\n' "$1"
  printf '============================================================\n'
}

{
  echo "AUDIT MINI-SITES SEO — MONDESCALE MARKETING ENGINE"
  echo "Date : $(date --iso-8601=seconds)"
  echo "Branche : $(git branch --show-current)"
  echo "Commit : $(git rev-parse HEAD)"
  echo "Dépôt : $(git remote get-url origin 2>/dev/null || echo inconnu)"

  section "1. ENVIRONNEMENT FRONTEND"

  node --version 2>/dev/null || true
  npm --version 2>/dev/null || true

  echo
  echo "--- package.json frontend ---"
  sed -n '1,240p' frontend/package.json 2>/dev/null || true

  echo
  echo "--- Configurations Next.js ---"
  find frontend -maxdepth 2 \
    \( -name 'next.config.js' -o -name 'next.config.mjs' -o -name 'next.config.ts' \) \
    -print

  for file in \
    frontend/next.config.js \
    frontend/next.config.mjs \
    frontend/next.config.ts \
    frontend/proxy.js \
    frontend/proxy.ts
  do
    if [ -f "$file" ]; then
      echo
      echo "--- $file ---"
      sed -n '1,260p' "$file"
    fi
  done

  section "2. ROUTES PUBLIQUES MINI-SITES"

  find frontend/app \
    -type d \
    \( -path '*/node_modules/*' -o -path '*/.next/*' \) -prune -o \
    -type f \
    \( -name 'page.js' -o -name 'page.jsx' -o -name 'page.ts' -o -name 'page.tsx' \
       -o -name 'layout.js' -o -name 'layout.jsx' -o -name 'layout.ts' -o -name 'layout.tsx' \
       -o -name 'route.js' -o -name 'route.ts' \) \
    -print \
  | grep -E '/agence/|sitemap|robots|manifest' \
  | sort || true

  echo
  echo "--- Arborescence agence ---"
  if [ -d frontend/app/agence ]; then
    find frontend/app/agence -maxdepth 8 -type f | sort
  else
    echo "ABSENT : frontend/app/agence"
  fi

  section "3. MÉTADONNÉES ET SEO TECHNIQUE"

  grep -RInE \
    "generateMetadata|export const metadata|metadataBase|alternates|canonical|openGraph|twitter|robots|sitemap|manifest|viewport" \
    frontend/app frontend/components frontend/lib frontend/src \
    2>/dev/null \
  | head -500 || true

  section "4. DONNÉES STRUCTURÉES JSON-LD"

  grep -RInE \
    "application/ld\\+json|schema\\.org|LocalBusiness|TravelAgency|TouristDestination|BreadcrumbList|FAQPage|Organization|WebSite" \
    frontend/app frontend/components frontend/lib frontend/src \
    2>/dev/null \
  | head -500 || true

  section "5. MAILLAGE INTERNE ET NAVIGATION"

  grep -RInE \
    "href=|<Link|next/link|router\\.push|redirect\\(|permanentRedirect\\(" \
    frontend/app/agence frontend/components frontend/lib \
    2>/dev/null \
  | head -700 || true

  section "6. IMAGES ET OPTIMISATION MÉDIA"

  grep -RInE \
    "next/image|<Image|<img|backgroundImage|remotePatterns|images:" \
    frontend/app/agence frontend/components frontend/lib frontend/next.config.* \
    2>/dev/null \
  | head -500 || true

  section "7. SOURCES DE DONNÉES DES MINI-SITES"

  grep -RInE \
    "prisma|fetch\\(|axios|API_URL|BACKEND|agency|agencies|destination|destinations|knowledge|slug" \
    frontend/app/agence frontend/components frontend/lib frontend/src \
    2>/dev/null \
  | head -900 || true

  section "8. MODÈLES PRISMA POTENTIELLEMENT CONCERNÉS"

  PRISMA_FILES="$(find . \
    -path './.git' -prune -o \
    -path './frontend/node_modules' -prune -o \
    -path './frontend/.next' -prune -o \
    -path './backups' -prune -o \
    -path './.sprint-backups' -prune -o \
    -name 'schema.prisma' -print)"

  if [ -n "$PRISMA_FILES" ]; then
    echo "$PRISMA_FILES"

    while IFS= read -r schema; do
      [ -n "$schema" ] || continue

      echo
      echo "--- $schema : modèles liés ---"

      awk '
        /^model / {
          model=$2
          capture=(tolower(model) ~ /(agency|agence|destination|location|network|brand|seo|page|content|knowledge|media)/)
        }
        capture { print }
        capture && /^}/ { capture=0; print "" }
      ' "$schema"
    done <<< "$PRISMA_FILES"
  else
    echo "Aucun schema.prisma trouvé."
  fi

  section "9. COMPOSANTS UTILISÉS PAR LES ROUTES AGENCE"

  grep -RInE \
    "^import .* from|^import \\{" \
    frontend/app/agence \
    2>/dev/null \
  | sort \
  | head -700 || true

  section "10. VARIABLES D'ENVIRONNEMENT RÉFÉRENCÉES"

  grep -RhoE \
    "process\\.env\\.[A-Z0-9_]+" \
    frontend/app/agence frontend/components frontend/lib frontend/src frontend/proxy.* \
    2>/dev/null \
  | sort -u || true

  section "11. FICHIERS SITEMAP, ROBOTS ET MANIFEST"

  find frontend \
    -path 'frontend/node_modules' -prune -o \
    -path 'frontend/.next' -prune -o \
    -type f \
    \( -iname 'sitemap.*' -o -iname 'robots.*' -o -iname 'manifest.*' \) \
    -print \
  | sort || true

  section "12. DÉTECTION D'ANOMALIES RAPIDES"

  echo "--- TODO / FIXME / HACK ---"
  grep -RInE \
    "TODO|FIXME|HACK|TEMP|PLACEHOLDER" \
    frontend/app/agence frontend/components frontend/lib \
    2>/dev/null \
  | head -300 || true

  echo
  echo "--- URLs locales ou codées en dur ---"
  grep -RInE \
    "localhost|127\\.0\\.0\\.1|192\\.168\\.|http://" \
    frontend/app/agence frontend/components frontend/lib frontend/src \
    2>/dev/null \
  | head -300 || true

  echo
  echo "--- Slugs et contenus de démonstration ---"
  grep -RInE \
    "budapest|ozoir|demo|mock|fixture|fallback|placeholder" \
    frontend/app/agence frontend/components frontend/lib frontend/src \
    2>/dev/null \
  | head -500 || true

  section "13. TAILLE ET COMPLEXITÉ DES FICHIERS MINI-SITES"

  if [ -d frontend/app/agence ]; then
    find frontend/app/agence frontend/components frontend/lib \
      -type f \
      \( -name '*.js' -o -name '*.jsx' -o -name '*.ts' -o -name '*.tsx' -o -name '*.css' \) \
      -print0 2>/dev/null \
    | xargs -0 wc -l 2>/dev/null \
    | sort -nr \
    | head -100 || true
  fi

  section "14. ÉTAT GIT"

  git status --short
  git log -10 --oneline --decorate

  section "15. FIN DU RAPPORT"

  echo "Rapport généré : $OUT"
} > "$OUT"

cp "$OUT" "$LATEST"

echo "$OUT"
