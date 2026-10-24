# Plateforme de pré-sélection de profils

Monorepo : front React, gateway Spring Cloud, Keycloak et 5 microservices Spring Boot, chacun avec sa base PostgreSQL, reliés par RabbitMQ. Tout se lance en local avec Docker Compose.

```
backend/      POM parent Maven + common-lib + gateway-service + 5 services métier
frontend/     React 19 + TypeScript + Vite
infra/        init des bases PostgreSQL, realm Keycloak
docker-compose.yml
```

## Démarrer

Prérequis : Docker Desktop avec au moins 6 Go de RAM alloués.

```bash
cp .env.example .env          # Windows : copy .env.example .env
docker compose up -d --build
```

Le premier build télécharge les dépendances Maven et npm (10 à 15 minutes). Ensuite :

| Quoi | Adresse | Identifiants |
| --- | --- | --- |
| Application | http://localhost:3000 | voir comptes ci-dessous |
| Keycloak (console) | http://localhost:8180 | admin / admin |
| Mailpit (e-mails envoyés) | http://localhost:8025 | — |
| RabbitMQ (console) | http://localhost:15672 | recrutement / recrutement |
| MinIO (console) | http://localhost:9001 | recrutement / recrutement123 |
| Gateway (API) | http://localhost:8080/api/... | jeton Keycloak |

### Comptes de test (realm `recrutement`)

| Rôle | E-mail | Mot de passe |
| --- | --- | --- |
| Recruteur | recruteur@recrutement.local | recruteur |
| Entreprise (Atlas Digital) | client.atlas@recrutement.local | client |
| Candidat (Yassine B.) | candidat@recrutement.local | candidat |

Les candidats peuvent aussi s'inscrire eux-mêmes depuis la page de connexion (rôle CANDIDAT attribué par défaut).

### Parcours à tester

1. **Recruteur** : tableau de bord → Missions → « Développeur Java senior » → *Suggestions du vivier* → ajouter un profil → le glisser jusqu'à « Qualifié » → l'évaluer → cocher *Shortlist* → *Envoyer la shortlist*.
2. **Entreprise** : « Évaluer 2 profils » → *À rencontrer* → *Proposer un entretien*. L'e-mail arrive dans Mailpit.
3. **Candidat** : confirmer l'entretien depuis l'accueil, compléter le profil, déposer un CV.
4. **Recruteur** : glisser le candidat jusqu'à « Placé » (salaire + date d'embauche) → Facturation : une facture brouillon est prête → *Émettre* → *PDF*.

## Développer hors Docker

Lancer seulement l'infrastructure, puis un service depuis l'IDE :

```bash
docker compose up -d postgres rabbitmq keycloak minio mailpit
cd backend && mvn -pl candidat-service -am spring-boot:run
cd frontend && npm install && npm run dev      # http://localhost:5173
```

Chaque service lit `localhost` par défaut (voir son `application.yml`). La gateway route `/api/**` vers les services sur les ports 8082 à 8086.

Tests unitaires (calcul du score de matching, honoraires et TVA) : `cd backend && mvn test`.

## Architecture

| Service | Port | Rôle | Base |
| --- | --- | --- | --- |
| gateway-service | 8080 | Routage, vérification du JWT, CORS | — |
| entreprise-service | 8082 | Entreprises, contacts, missions | entreprise_db |
| candidat-service | 8083 | Vivier, CV (MinIO), recherche, regroupements, RGPD | candidat_db |
| selection-service | 8084 | Pipeline, matching, shortlists, avis client, entretiens, statistiques | selection_db |
| facturation-service | 8085 | Placements, factures, PDF | facturation_db |
| notification-service | 8086 | E-mails et notifications in-app | notification_db |
| Keycloak | 8180 | Comptes, rôles, connexion OIDC | keycloak_db |

**Sécurité** : chaque service vérifie lui-même le JWT Keycloak (`common-lib` / `ServiceSecurityConfiguration`). Les rôles de realm deviennent `ROLE_RECRUTEUR`, `ROLE_ENTREPRISE`, `ROLE_CANDIDAT`. Un compte entreprise porte l'attribut Keycloak `entrepriseId`, ajouté au jeton par un mapper : il isole les données de chaque client.

**Appels entre services** : selection-service appelle entreprise-service et candidat-service en REST (OpenFeign), en propageant le jeton de l'utilisateur.

**Événements RabbitMQ** (exchange `recrutement.events`) :

| Événement | Émetteur | Consommateurs |
| --- | --- | --- |
| mission.ouverte | entreprise | notification |
| candidat.cree / candidat.modifie | candidat | (réservé) |
| shortlist.envoyee | selection | notification |
| retour.client | selection | notification |
| entretien.planifie | selection | notification |
| candidat.place | selection | facturation (facture brouillon), notification |
| facture.emise | facturation | notification |

**Données de démo** : chaque service charge un jeu de données avec Flyway (`V2__donnees_demo.sql`). Pour repartir de zéro : `docker compose down -v`.

**Swagger** : `http://localhost:808x/swagger-ui.html` sur chaque service (ports exposés en développement hors Docker).

## Observabilité (à ajouter)

Les services exposent déjà `/actuator/prometheus` (Micrometer) et Keycloak a `KC_METRICS_ENABLED=true`. Reste à ajouter dans `docker-compose.yml`, sous un profil `observabilite` : Prometheus, Grafana, Elasticsearch, Logstash et Kibana, plus `logstash-logback-encoder` dans les services pour les logs JSON.

## Limites connues de cette première version

- L'extraction automatique des CV (Tika) n'est pas encore branchée : le CV est stocké, le profil se saisit à la main.
- La 2FA du recruteur n'est pas imposée en local : l'activer dans Keycloak (action requise « Configure OTP »).
- Les comptes entreprise se créent dans la console Keycloak (rôle ENTREPRISE + attribut `entrepriseId`).
- Pas encore de tests d'intégration (Testcontainers) ni de file d'erreurs RabbitMQ dédiée.
- Front : CSS maison et glisser-déposer natif HTML5 (pas de Tailwind ni dnd-kit pour l'instant).
