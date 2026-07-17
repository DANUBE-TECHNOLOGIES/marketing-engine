#!/bin/bash

FILE="$1"

echo
echo "Analyse : $FILE"

grep -Ei \
"DROP TABLE|DROP COLUMN|DELETE FROM|TRUNCATE|ALTER TYPE" \
"$FILE" || true

COUNT=$(grep -Eic \
"DROP TABLE|DROP COLUMN|DELETE FROM|TRUNCATE|ALTER TYPE" \
"$FILE")

echo

if [ "$COUNT" -gt 0 ]; then
    echo "❌ Migration dangereuse ($COUNT opération(s))"
    exit 1
fi

echo "✅ Migration validée"
