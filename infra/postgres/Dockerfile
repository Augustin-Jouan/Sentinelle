FROM postgres:17.11-bookworm@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826
# Les rôles de la base, créés ou mis à jour à chaque démarrage, avant prisma migrate.
# Les scripts sont dans l'image : une plateforme qui tire des images (Coolify) n'a pas le dépôt sous la main.
COPY roles.sh roles.sql /
USER postgres
ENTRYPOINT ["bash", "/roles.sh"]
