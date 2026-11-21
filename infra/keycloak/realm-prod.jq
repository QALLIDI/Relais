# Transforme le realm local (localhost, Mailpit, secret de dev) en realm de production.
# Les valeurs ${...} sont remplacées par Keycloak au démarrage, depuis les variables d'environnement
# (https://www.keycloak.org/server/importExport) : toutes doivent être définies sur le service.
.sslRequired = "external"
| .smtpServer = {
    "host": "${SMTP_HOST}",
    "port": "${SMTP_PORT}",
    "from": "${MAIL_FROM}",
    "fromDisplayName": "Relais",
    "auth": "true",
    "user": "${SMTP_USERNAME}",
    "password": "${SMTP_PASSWORD}",
    "starttls": "${SMTP_STARTTLS}",
    "ssl": "false"
  }
# Pas de client Swagger en production.
| .clients |= map(select(.clientId != "swagger"))
| .clients |= map(
    if .clientId == "frontend" then
      .rootUrl = "${FRONT_URL}"
      | .redirectUris = ["${FRONT_URL}/*"]
      | .webOrigins = ["${FRONT_URL}"]
      | .attributes["post.logout.redirect.uris"] = "${FRONT_URL}/*"
    elif .clientId == "compte-service" then
      .secret = "${COMPTE_SERVICE_SECRET}"
    else . end)
