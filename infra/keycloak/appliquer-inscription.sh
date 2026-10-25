#!/bin/sh
# Applique au realm « recrutement » déjà importé les réglages de l'inscription (compte-service),
# sans supprimer les comptes existants. realm-recrutement.json contient les mêmes réglages
# pour une base neuve (docker compose down -v).
#
#   docker compose exec -T keycloak sh < infra/keycloak/appliquer-inscription.sh
set -e
KC=/opt/keycloak/bin/kcadm.sh
R=recrutement

$KC config credentials --server http://localhost:8080 --realm master \
  --user "${KC_BOOTSTRAP_ADMIN_USERNAME:-admin}" --password "${KC_BOOTSTRAP_ADMIN_PASSWORD:-admin}"

$KC update realms/$R -s registrationAllowed=false -s verifyEmail=true -s emailTheme=recrut \
  -s 'passwordPolicy=length(8) and specialChars(1) and regexPattern(.*[A-Z0-9].*)'

# Le rôle vient de compte-service (CANDIDAT ou ENTREPRISE), plus du rôle par défaut.
$KC remove-roles -r $R --rname default-roles-$R --rolename CANDIDAT 2>/dev/null || true

FRONT=$($KC get clients -r $R -q clientId=frontend --fields id --format csv --noquotes)
$KC update clients/$FRONT -r $R -s rootUrl=http://localhost:3000 -s baseUrl=/

if [ -z "$($KC get clients -r $R -q clientId=compte-service --fields id --format csv --noquotes)" ]; then
  $KC create clients -r $R -s clientId=compte-service -s 'name=compte-service (Admin API, inscription)' \
    -s enabled=true -s publicClient=false -s clientAuthenticatorType=client-secret \
    -s "secret=${COMPTE_SERVICE_SECRET:-compte-service-secret}" \
    -s standardFlowEnabled=false -s directAccessGrantsEnabled=false -s serviceAccountsEnabled=true
fi
$KC add-roles -r $R --uusername service-account-compte-service --cclientid realm-management \
  --rolename manage-users --rolename view-users --rolename query-users --rolename view-realm

echo "Realm $R prêt pour l'inscription."
