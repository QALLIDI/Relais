# Image Keycloak de production (Railway) : thème Recrut et realm intégrés, démarrage optimisé.
# En local, docker-compose.yml garde l'image officielle en start-dev avec les fichiers montés.
#
# Variables à définir sur le service : KC_HOSTNAME (URL publique, https://…), KC_DB_URL,
# KC_DB_USERNAME, KC_DB_PASSWORD, KC_BOOTSTRAP_ADMIN_USERNAME, KC_BOOTSTRAP_ADMIN_PASSWORD,
# FRONT_URL, COMPTE_SERVICE_SECRET, SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD,
# SMTP_STARTTLS, MAIL_FROM.

FROM alpine:3.22 AS realm
RUN apk add --no-cache jq
COPY realm-recrutement.json realm-prod.jq /tmp/
RUN jq -f /tmp/realm-prod.jq /tmp/realm-recrutement.json > /tmp/realm-recrutement-prod.json

FROM quay.io/keycloak/keycloak:26.4 AS build
ENV KC_DB=postgres KC_HEALTH_ENABLED=true KC_METRICS_ENABLED=true
RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:26.4
COPY --from=build /opt/keycloak/ /opt/keycloak/
COPY themes/recrut /opt/keycloak/themes/recrut
COPY --from=realm /tmp/realm-recrutement-prod.json /opt/keycloak/data/import/realm-recrutement.json
ENV KC_DB=postgres \
    KC_PROXY_HEADERS=xforwarded \
    KC_HTTP_ENABLED=true \
    KC_HTTP_PORT=8080 \
    KC_HOSTNAME_BACKCHANNEL_DYNAMIC=true \
    JAVA_OPTS_KC_HEAP="-Xms256m -Xmx640m"
EXPOSE 8080
# Le realm n'est importé que s'il n'existe pas encore : les réglages faits ensuite dans la console restent.
ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start", "--optimized", "--import-realm"]
