# Plateforme de pré-sélection de profils

Monorepo : front React, gateway Spring Cloud, Keycloak et des microservices Spring Boot, chacun avec sa base PostgreSQL, reliés par Apache Kafka. Redis sert à la limitation de débit de la gateway et aux codes SMS de l'inscription. Tout se lance en local avec Docker Compose.

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
| Kafka UI (topics, messages, retard des consommateurs) | http://localhost:8090 | — |
| Gateway (API) | http://localhost:8080/api/... | jeton Keycloak |

### Comptes de test (realm `recrutement`)

| Rôle | E-mail | Mot de passe |
| --- | --- | --- |
| Recruteur | recruteur@recrutement.local | recruteur |
| Entreprise (Atlas Digital) | client.atlas@recrutement.local | client |
| Candidat (Yassine B.) | candidat@recrutement.local | candidat |

Candidats et entreprises créent leur compte sur http://localhost:3000/inscription (lien « Nouveau utilisateur ? » de la page de connexion). Voir [Inscription](#inscription-compte-service).

### Parcours à tester

1. **Recruteur** : tableau de bord → Missions → « Développeur Java senior » → *Suggestions du vivier* → ajouter un profil → le glisser jusqu'à « Qualifié » → l'évaluer → cocher *Shortlist* → *Envoyer la shortlist*.
2. **Entreprise** : « Évaluer 2 profils » → *À rencontrer* (une réunion « à planifier » s'ouvre dans l'agenda) → *Proposer un entretien* : choisir jusqu'à 3 créneaux dans la grille → *Envoyer*. Le candidat reçoit le lien dans Mailpit. Le recruteur peut aussi planifier depuis **Agenda** ou le bouton *Entretien* d'une carte du pipeline.
3. **Candidat** (Yassine B.) : accueil → *Choisir mon créneau* → *Confirmer*. Tous les participants reçoivent l'e-mail de confirmation avec l'invitation `.ics` jointe ; la candidature passe à « Entretien client ».
4. **Entreprise** : **Entretiens** → *Évaluer* → 4 notes de 1 à 5 et une décision. *Retenir* fait passer la candidature à « Offre », *Ne pas retenir* la sort du pipeline ; le recruteur reçoit l'avis.
5. **Recruteur** : glisser le candidat jusqu'à « Placé » (salaire + date d'embauche) → Facturation : une facture brouillon est prête → *Émettre* → *PDF*.

## Développer hors Docker

Lancer seulement l'infrastructure, puis un service depuis l'IDE :

```bash
docker compose up -d postgres kafka redis keycloak mailpit
cd backend && mvn -pl candidat-service -am spring-boot:run
cd frontend && npm install && npm run dev      # http://localhost:5173
```

Chaque service lit `localhost` par défaut (voir son `application.yml`). La gateway route `/api/**` vers les services sur les ports 8082 à 8088 (compte-service : `/api/comptes/**` et `/public/inscription/**`).

Tests unitaires (calcul du score de matching, honoraires et TVA) : `cd backend && mvn test`.

## Architecture

| Service | Port | Rôle | Base |
| --- | --- | --- | --- |
| gateway-service | 8080 | Routage, vérification du JWT, CORS | — |
| entreprise-service | 8082 | Entreprises, contacts, missions | entreprise_db |
| candidat-service | 8083 | Vivier, CV (dossier local data/cv), recherche, regroupements, RGPD | candidat_db |
| selection-service | 8084 | Pipeline, matching, shortlists, avis client, statistiques | selection_db |
| agenda-service | 8087 | Réunions : créneaux, disponibilités du client, confirmation, lien visio, invitation `.ics`, rappels, évaluation après entretien | agenda_db |
| facturation-service | 8085 | Placements, factures, PDF | facturation_db |
| notification-service | 8086 | E-mails, SMS (adaptateur console en local) et notifications in-app | notification_db |
| compte-service | 8088 | Inscription candidat ou entreprise : code SMS, création du compte Keycloak, e-mail d'activation | — (Redis + Keycloak) |
| Keycloak | 8180 | Comptes, rôles, connexion OIDC | keycloak_db |

**Sécurité** : chaque service vérifie lui-même le JWT Keycloak (`common-lib` / `ServiceSecurityConfiguration`). Les rôles de realm deviennent `ROLE_RECRUTEUR`, `ROLE_ENTREPRISE`, `ROLE_CANDIDAT`. Un compte entreprise porte l'attribut Keycloak `entrepriseId`, ajouté au jeton par un mapper : il isole les données de chaque client.

**Appels entre services** : selection-service appelle entreprise-service et candidat-service en REST (OpenFeign), en propageant le jeton de l'utilisateur. agenda-service lit la candidature et sa mission dans selection-service (`/internal/candidatures/{id}/contexte-reunion`, route non exposée par la gateway, droits vérifiés sur le jeton propagé).

**Événements Kafka** : un topic par service émetteur (`entreprise.events`, `candidat.events`, `selection.events`, `facturation.events`, `agenda.events`, `compte.events`), 3 partitions, rétention 7 jours. La clé du message est l'identifiant de l'objet concerné ; le type d'événement voyage dans l'en-tête `eventType`, le corps en JSON.

- **Publication** : outbox transactionnelle. Le service écrit l'événement dans sa table `outbox` dans la même transaction que la donnée, puis une tâche l'envoie dans Kafka (`common-lib` : `EventPublisher`, `OutboxRelay`).
- **Consommation** : un groupe de consommateurs par service (son nom). Chaque événement traité est noté dans `evenement_traite` : un message livré deux fois n'est traité qu'une fois (`EvenementsRecus`).
- **Erreurs** : 3 nouvelles tentatives espacées d'une seconde, puis le message part dans `<topic>.DLT`, visible dans Kafka UI.

| Événement | Émetteur | Consommateurs |
| --- | --- | --- |
| compte.code_sms | compte | notification (code à 6 chiffres par SMS) |
| compte.cree | compte | candidat (profil vide), entreprise (demande de rattachement) |
| mission.ouverte | entreprise | notification |
| candidat.cree / candidat.modifie | candidat | (réservé) |
| shortlist.envoyee | selection | notification |
| retour.client | selection | notification, agenda (« à rencontrer » ouvre une réunion à planifier) |
| reunion.proposee | agenda | notification (lien de choix du créneau au candidat) |
| reunion.confirmee | agenda | notification (e-mail + `.ics` à tous), selection (« Entretien client ») |
| reunion.rappel | agenda (tâche planifiée) | notification (e-mail 24 h avant, SMS 2 h avant) |
| reunion.reportee / reunion.annulee | agenda | notification |
| reunion.avis | agenda | selection (évaluation enregistrée, candidature avancée), notification |
| candidat.place | selection | facturation (facture brouillon), notification |
| facture.emise | facturation | notification |

**Données de démo** : chaque service charge un jeu de données avec Flyway (`V2__donnees_demo.sql`). Pour repartir de zéro : `docker compose down -v`.

**Swagger** : `http://localhost:808x/swagger-ui.html` sur chaque service (ports exposés en développement hors Docker).

## Agenda et réunions (agenda-service)

Les entretiens ont quitté selection-service (`/api/entretiens` n'existe plus) : tout passe par `/api/reunions` sur agenda-service.

- **Cycle** : *À planifier* (ouverte par un retour client « à rencontrer ») → *Proposée* (1 à 3 créneaux, stockés en UTC et affichés dans le fuseau du navigateur) → *Confirmée* (créneau choisi par le candidat) → *Terminée* (après l'heure de fin ou une fois évaluée). Un participant peut *reporter* (le créneau est libéré, une nouvelle proposition suit) ; le recruteur ou le client peut *annuler*. Report et annulation demandent un motif.
- **Visibilité** : le recruteur voit toutes les réunions, le client les entretiens client de son entreprise (`entrepriseId` du jeton), le candidat les siennes (e-mail du jeton). Les e-mails des participants et le compte rendu ne sont montrés qu'au recruteur.
- **Visio** : `VISIO_PROVIDER=fake` (par défaut) crée une salle Jitsi publique nommée d'après la réunion. Les adaptateurs Google Calendar (Meet) et Microsoft Graph (Teams) existent derrière l'interface `VisioProvider` mais ne sont pas branchés.
- **Invitation** : fichier `.ics` (ical4j) joint aux e-mails de confirmation et téléchargeable (`GET /api/reunions/{id}/invitation.ics`).
- **Rappels** : tâche toutes les 5 minutes (`RAPPELS_CRON`), verrouillée par ShedLock (table `shedlock`) pour ne tourner que sur une instance : e-mail dans les 24 h qui précèdent, SMS dans les 2 h. En local, le SMS est écrit dans les logs de notification-service (`[SMS console]`) et copié dans Mailpit.
- **Disponibilités du client** : plages hebdomadaires saisies dans l'espace entreprise (**Entretiens**) ; la grille de planification ne propose que les créneaux qui y tiennent et qui ne chevauchent pas une autre réunion.
- **Évaluation** : grille commune (technique, communication, motivation, adéquation à l'équipe, de 1 à 5) et décision *Retenir* / *Second entretien* / *Ne pas retenir*, publiée dans `reunion.avis`. Le recruteur saisit son compte rendu depuis l'agenda.
- **Données de démo** : les deux entretiens de démonstration de selection-service sont repris (mêmes identifiants) et Atlas Digital a trois plages de disponibilité.

**Base déjà créée** : `init-db.sql` ne tourne qu'au premier démarrage de PostgreSQL. Sur un volume existant, créer la base avant `docker compose up` :

```bash
docker compose exec postgres psql -U recrutement -d postgres -c "create database agenda_db"
```

## Inscription (compte-service)

Parcours public en 5 étapes sur `/inscription` (routes `/public/inscription/**` ouvertes sans jeton par la gateway, limitées par adresse IP) :

1. **Type de compte et e-mail** : candidat ou entreprise (avec la raison sociale), prénom, nom, e-mail.
2. **Téléphone et mot de passe** : numéro validé par libphonenumber (un numéro par compte activé). compte-service crée le compte Keycloak **désactivé** par l'Admin API, avec le rôle de realm ; le mot de passe va directement dans Keycloak, il n'est jamais stocké.
3. **Code SMS** à 6 chiffres : haché (HMAC) dans Redis, valable 10 min, 5 essais. Renvoi : 1 toutes les 60 s, 5 par numéro et par heure.
4. **E-mail d'activation** : le compte est activé avec l'action requise « Vérifier l'e-mail » et Keycloak envoie son e-mail natif (thème `recrut`, lien valable 24 h). `compte.cree` est publié : candidat-service prépare un profil vide, entreprise-service enregistre une demande de rattachement (`GET /api/entreprises/demandes-rattachement`, recruteur).
5. **Compte activé** : après le clic, le lien ramène sur `/inscription?id=…`. Le candidat se connecte et complète son profil ; l'entreprise voit « en attente de rattachement » tant que le recruteur n'a pas posé l'attribut `entrepriseId`.

Une tâche horaire supprime les comptes Keycloak d'inscriptions non terminées (code SMS jamais validé) après 48 h. compte-service n'a pas de base : sans outbox, il publie directement dans Kafka (`KafkaTemplate`), une étape échoue si Kafka ne répond pas.

**En local**, aucun SMS réel : le code est dans les logs de notification-service (`docker compose logs notification-service | grep "SMS console"`) et dans Mailpit, adressé à `<numéro>@sms.recrutement.local`. Le fournisseur se choisit par `SMS_PROVIDER` (`console` par défaut) ; un vrai fournisseur s'ajoute en implémentant `SmsSender`.

**Keycloak** : inscription libre désactivée, client confidentiel `compte-service` (Client Credentials, rôles `manage-users`, `view-users`, `query-users`, `view-realm`), politique de mot de passe (8 caractères, majuscule ou chiffre, caractère spécial), e-mail vérifié obligatoire pour se connecter. Le secret de développement (`compte-service-secret`, variable `COMPTE_SERVICE_SECRET`) et `INSCRIPTION_SECRET` sont à changer en production.

**Realm déjà importé** : `--import-realm` ignore un realm qui existe déjà. Sur une base Keycloak existante, appliquer ces réglages sans toucher aux comptes :

```bash
docker compose exec -T keycloak sh < infra/keycloak/appliquer-inscription.sh
```

## Observabilité (à ajouter)

Les services exposent déjà `/actuator/prometheus` (Micrometer) et Keycloak a `KC_METRICS_ENABLED=true`. Reste à ajouter dans `docker-compose.yml`, sous un profil `observabilite` : Prometheus, Grafana, Elasticsearch, Logstash et Kibana, plus `logstash-logback-encoder` dans les services pour les logs JSON.

## Limites connues de cette première version

- L'extraction automatique des CV (Tika) n'est pas encore branchée : le CV est stocké, le profil se saisit à la main.
- La 2FA du recruteur n'est pas imposée en local : l'activer dans Keycloak (action requise « Configure OTP »).
- Le rattachement d'un compte entreprise se fait encore dans la console Keycloak (attribut `entrepriseId`) : l'écran recruteur des demandes de rattachement reste à faire.
- Pas de fournisseur SMS réel : seul l'adaptateur console existe.
- Pas encore de tests d'intégration (Testcontainers).
- Front : CSS maison et glisser-déposer natif HTML5 (pas de Tailwind ni dnd-kit pour l'instant).

## Interface (maquettes « Ember »)

Le front suit les maquettes « Ember » : police Outfit, cartes très arrondies, accent orange. Toutes les couleurs sont des variables CSS dans `frontend/src/styles.css`. Le mode sombre suit le réglage du système ; le bouton lune/soleil de l'en-tête force un thème et le mémorise dans le navigateur.

La page de connexion Keycloak utilise le thème `recrut` (`infra/keycloak/themes/recrut`, CSS seulement, basé sur le thème `keycloak`). Il est déclaré dans le realm importé. Sur une base Keycloak déjà créée, l'import ne se rejoue pas : choisir `recrut` dans la console (Realm settings → Themes → Login theme) ou repartir de zéro avec `docker compose down -v`.
