#!/bin/bash
# Une sauvegarde : pg_dump chiffré par age (clé publique seulement), copie sur OVHcloud.
# La rotation distante est une règle de cycle de vie du bucket (14 jours), pas un droit de suppression ici.
# La rotation locale reste de 14 fichiers.
set -euo pipefail

: "${AGE_DESTINATAIRE:?clé publique age manquante (AGE_DESTINATAIRE)}"
fichier="/sauvegardes/sentinelle-$(date +%Y%m%d-%H%M%S).dump.age"

pg_dump -Fc | age -r "$AGE_DESTINATAIRE" > "$fichier.partiel"
mv "$fichier.partiel" "$fichier"

if [ -n "${OVH_BUCKET:-}" ]; then
	rclone copy "$fichier" "ovh:$OVH_BUCKET/"
elif [ "${SAUVEGARDE_LOCALE_SEULEMENT:-0}" != "1" ]; then
	echo "OVH_BUCKET manquant : la copie hors du VPS est obligatoire." >&2
	exit 1
fi

ls -1t /sauvegardes/sentinelle-*.dump.age | tail -n +15 | xargs -r rm --
touch /sauvegardes/.derniere-reussite
echo "Sauvegarde terminée : $fichier"
