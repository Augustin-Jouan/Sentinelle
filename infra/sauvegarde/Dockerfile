FROM postgres:17.11-bookworm
RUN apt-get update \
 && apt-get install -y --no-install-recommends age rclone ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY sauvegarder.sh boucle.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/sauvegarder.sh /usr/local/bin/boucle.sh
# En erreur si la dernière réussite date de plus de 26 heures, ou dès qu'une sauvegarde échoue (boucle.sh efface alors le marqueur).
HEALTHCHECK --interval=15m --retries=1 --start-period=15m CMD find /sauvegardes/.derniere-reussite -mmin -1560 | grep -q .
CMD ["boucle.sh"]
