#!/bin/bash
# Crée ou met à jour les trois rôles. À lancer après que Postgres est healthy, avant prisma migrate.
set -euo pipefail
: "${PASS_APP:?POSTGRES_PASSWORD_APP manquant}"
: "${PASS_MIGRATION:?POSTGRES_PASSWORD_MIGRATION manquant}"
: "${PASS_SAUVEGARDE:?POSTGRES_PASSWORD_SAUVEGARDE manquant}"
: "${PGPASSWORD:?POSTGRES_PASSWORD manquant}"
psql -v ON_ERROR_STOP=1 \
	-v pass_app="$PASS_APP" \
	-v pass_migration="$PASS_MIGRATION" \
	-v pass_sauvegarde="$PASS_SAUVEGARDE" \
	-f /roles.sql
