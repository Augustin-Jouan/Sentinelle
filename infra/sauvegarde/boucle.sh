#!/bin/bash
# Une sauvegarde au démarrage, puis chaque nuit à 02:30 (heure de Paris, TZ du conteneur).
set -uo pipefail
while true; do
	if ! sauvegarder.sh; then
		# Sans marqueur, le healthcheck passe en erreur à son prochain passage (spec § 9).
		rm -f /sauvegardes/.derniere-reussite
		echo "Échec de la sauvegarde." >&2
	fi
	# Prochain 02:30 : aujourd'hui s'il n'est pas encore passé (redémarrage après minuit), sinon demain.
	cible=$(date -d 'today 02:30' +%s)
	[ "$cible" -le "$(date +%s)" ] && cible=$(date -d 'tomorrow 02:30' +%s)
	sleep $(( cible - $(date +%s) ))
done
