# Déploiement sur Railway

Ce guide met la plateforme en ligne sur Railway : 8 services Spring, le front, Keycloak, PostgreSQL,
Redis et Kafka, dans un seul projet Railway. Comptez environ 5 à 6 Go de mémoire au total.

## 1. Avant de commencer

- Le code est sur **GitHub** (Railway ne lit pas GitLab) : miroir GitHub du dépôt, branche `main` à jour.
- `docker compose up -d --build` fonctionne en local (même code, mêmes images).
- Un compte Railway avec un plan payant, région **Europe (Amsterdam)**.
- Un serveur SMTP (adresse, port, identifiant, mot de passe) et une clé Zavu (`zv_live_…`).

## 2. Ce qu'on crée sur Railway

| Service Railway | Source | Réglages | Domaine public |
| --- | --- | --- | --- |
| `Postgres` | Base PostgreSQL de Railway | — | non |
| `Redis` | Redis de Railway | — | non |
| `kafka` | image `apache/kafka:4.1.0` | volume sur `/var/lib/kafka/data` | non |
| `keycloak` | dépôt GitHub, dossier racine `/infra/keycloak` | Dockerfile du dossier | **oui** |
| `gateway-service` | dépôt GitHub, dossier racine `/backend` | `RAILWAY_DOCKERFILE_PATH=Dockerfile.railway`, `SERVICE=gateway-service` | **oui** |
| `entreprise-service`, `candidat-service`, `selection-service`, `facturation-service`, `notification-service`, `agenda-service`, `compte-service` | dépôt GitHub, dossier racine `/backend` | `RAILWAY_DOCKERFILE_PATH=Dockerfile.railway`, `SERVICE=<nom du service>` | non |
| `frontend` | dépôt GitHub, dossier racine `/frontend` | Dockerfile du dossier | **oui** |

Gardez exactement ces noms de services : les adresses internes en dépendent
(`<service>.railway.internal`).

Pour chaque service Spring, réglez le contrôle de santé sur `/actuator/health/readiness`
(délai 300 s). Pour Keycloak, sur `/realms/recrutement`.

## 3. Créer les bases PostgreSQL

Une fois `Postgres` démarré, créez une base par service, une seule fois :

```bash
railway connect Postgres
\i infra/postgres/init-db.sql
```

Les services créent ensuite leurs tables eux-mêmes (Flyway) au premier démarrage.

## 4. Variables

Les références `${{Service.VARIABLE}}` sont résolues par Railway. Mettez les valeurs communes dans les
**variables partagées** du projet.

### Variables partagées

| Variable | Valeur |
| --- | --- |
| `DB_HOST` | `${{Postgres.PGHOST}}` |
| `DB_PORT` | `${{Postgres.PGPORT}}` |
| `DB_USER` | `${{Postgres.PGUSER}}` |
| `DB_PASSWORD` | `${{Postgres.PGPASSWORD}}` |
| `KAFKA_BOOTSTRAP` | `kafka.railway.internal:9092` |
| `KEYCLOAK_INTERNAL_URL` | `http://keycloak.railway.internal:8080` |
| `KEYCLOAK_PUBLIC_URL` | `https://${{keycloak.RAILWAY_PUBLIC_DOMAIN}}` |
| `FRONT_URL` | `https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}` |
| `JAVA_OPTS` | `-XX:MaxRAMPercentage=75` |

### Par service

| Service | Variables |
| --- | --- |
| tous les services Spring | `PORT` (8080 gateway, 8082 entreprise, 8083 candidat, 8084 sélection, 8085 facturation, 8086 notification, 8087 agenda, 8088 compte), `SERVICE`, `RAILWAY_DOCKERFILE_PATH=Dockerfile.railway`, et les variables partagées dont il a besoin |
| `gateway-service` | `ENTREPRISE_SERVICE_URL=http://entreprise-service.railway.internal:8082`, idem `CANDIDAT_`, `SELECTION_`, `FACTURATION_`, `NOTIFICATION_`, `AGENDA_`, `COMPTE_SERVICE_URL` ; `CORS_ALLOWED_ORIGINS=${{shared.FRONT_URL}}` ; `REDIS_HOST=${{Redis.REDISHOST}}`, `REDIS_PORT=${{Redis.REDISPORT}}`, `REDIS_PASSWORD=${{Redis.REDISPASSWORD}}` |
| `candidat-service` | `CV_STORAGE_DIR=/data/cv`, `RAILWAY_RUN_UID=0`, **volume** monté sur `/data/cv` |
| `selection-service` | `ENTREPRISE_SERVICE_URL`, `CANDIDAT_SERVICE_URL` (adresses internes) |
| `facturation-service` | `CABINET_NOM`, `CABINET_ADRESSE`, `CABINET_ICE` |
| `selection-service` | `FRONT_URL` (lien « passer le test » envoyé au candidat) |
| `notification-service` | `SMTP_HOST`, `SMTP_PORT` (587), `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_AUTH=true`, `SMTP_STARTTLS=true`, `MAIL_FROM`, `RECRUTEUR_EMAIL`, `SMS_PROVIDER=zavu`, `ZAVU_API_KEY`, `ZAVU_SENDER` (facultatif) |
| `agenda-service` | `SELECTION_SERVICE_URL`, `RECRUTEUR_EMAIL`, `VISIO_PROVIDER` |
| `compte-service` | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (comme la gateway), `COMPTE_SERVICE_SECRET`, `INSCRIPTION_SECRET` (au moins 32 caractères au hasard), `SMS_PAYS=MA`, `SMS_PAR_JOUR=300` |
| `keycloak` | `PORT=8080`, `KC_HOSTNAME=https://${{RAILWAY_PUBLIC_DOMAIN}}`, `KC_DB_URL=jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/keycloak_db`, `KC_DB_USERNAME`, `KC_DB_PASSWORD`, `KC_BOOTSTRAP_ADMIN_USERNAME`, `KC_BOOTSTRAP_ADMIN_PASSWORD`, `FRONT_URL`, `COMPTE_SERVICE_SECRET` (le même que compte-service), `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_STARTTLS=true`, `MAIL_FROM` |
| `frontend` | `VITE_API_URL=https://${{gateway-service.RAILWAY_PUBLIC_DOMAIN}}`, `VITE_KEYCLOAK_URL=https://${{keycloak.RAILWAY_PUBLIC_DOMAIN}}/realms/recrutement`, `VITE_KEYCLOAK_CLIENT_ID=frontend` (lues au moment du build) |

### Kafka (un nœud KRaft)

| Variable | Valeur |
| --- | --- |
| `KAFKA_NODE_ID` | `1` |
| `KAFKA_PROCESS_ROLES` | `broker,controller` |
| `KAFKA_LISTENERS` | `PLAINTEXT://:9092,CONTROLLER://:9093` |
| `KAFKA_ADVERTISED_LISTENERS` | `PLAINTEXT://kafka.railway.internal:9092` |
| `KAFKA_LISTENER_SECURITY_PROTOCOL_MAP` | `PLAINTEXT:PLAINTEXT,CONTROLLER:PLAINTEXT` |
| `KAFKA_CONTROLLER_LISTENER_NAMES` | `CONTROLLER` |
| `KAFKA_CONTROLLER_QUORUM_VOTERS` | `1@localhost:9093` |
| `KAFKA_INTER_BROKER_LISTENER_NAME` | `PLAINTEXT` |
| `KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR`, `KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR`, `KAFKA_TRANSACTION_STATE_LOG_MIN_ISR` | `1` |
| `KAFKA_AUTO_CREATE_TOPICS_ENABLE` | `false` |
| `KAFKA_LOG_DIRS` | `/var/lib/kafka/data/kafka-logs` (sous-dossier : la racine du volume contient `lost+found`, que Kafka refuse) |
| `KAFKA_HEAP_OPTS` | `-Xms256m -Xmx512m` |
| `RAILWAY_RUN_UID` | `0` (le volume est monté en root) |

## 5. Ordre de mise en route

1. `Postgres`, `Redis`, puis les bases (section 3).
2. `kafka`.
3. `keycloak` : le realm de production est importé au premier démarrage, avec l'adresse du front,
   le serveur SMTP et le secret de compte-service tirés des variables. Les réglages faits ensuite
   dans la console Keycloak sont conservés aux redémarrages.
4. Les services Spring, puis `gateway-service`.
5. `frontend`, en dernier : ses adresses sont figées au build.

## 6. Vérifications

- Le front s'ouvre et la connexion redirige vers Keycloak, puis revient sur le front.
- Une inscription candidat reçoit le SMS (Zavu) et l'e-mail d'activation (SMTP).
- Un CV envoyé est relu après un redémarrage de `candidat-service` (volume).
- Les journaux de chaque service ne montrent pas d'erreur Kafka ou base.

## 7. Sécurité

- Tous les mots de passe et secrets sont neufs : rien ne vient de `.env`.
- `INSCRIPTION_SECRET` et `COMPTE_SERVICE_SECRET` : 32 caractères au hasard ou plus.
- Les codes SMS ne partent que vers les pays de `SMS_PAYS` (Maroc par défaut), au plus 5 par numéro
  et par heure, et au plus `SMS_PAR_JOUR` par jour au total.
- Seuls `frontend`, `gateway-service` et `keycloak` ont un domaine public.
