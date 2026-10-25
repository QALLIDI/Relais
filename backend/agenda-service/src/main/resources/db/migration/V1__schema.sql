-- Réunions entre un client, un candidat de sa shortlist et le recruteur. Toutes les dates sont en UTC.
create table reunion (
    id                  uuid primary key,
    candidature_id      uuid,
    mission_id          uuid,
    entreprise_id       uuid,
    mission_intitule    varchar(255),
    entreprise_nom      varchar(255),
    candidat_id         uuid,
    candidat_nom        varchar(200),
    candidat_email      varchar(255),
    contact_email       varchar(255),
    nature              varchar(30)  not null,
    type                varchar(20)  not null,
    duree_minutes       integer      not null,
    statut              varchar(20)  not null,
    lieu                varchar(255),
    lien_visio          varchar(500),
    debut               timestamptz,
    fin                 timestamptz,
    motif               varchar(500),
    compte_rendu        text,
    proposee_par        varchar(255),
    rappel_email_envoye boolean      not null default false,
    rappel_sms_envoye   boolean      not null default false,
    created_at          timestamptz  not null default now(),
    updated_at          timestamptz  not null default now()
);
create index idx_reunion_entreprise on reunion (entreprise_id);
create index idx_reunion_candidat on reunion (lower(candidat_email));
create index idx_reunion_candidature on reunion (candidature_id);
create index idx_reunion_debut on reunion (statut, debut);

-- Au plus 3 créneaux proposés par réunion ; celui que le candidat choisit est marqué.
create table creneau (
    id         uuid primary key,
    reunion_id uuid        not null references reunion (id) on delete cascade,
    debut      timestamptz not null,
    fin        timestamptz not null,
    choisi     boolean     not null default false
);
create index idx_creneau_reunion on creneau (reunion_id);

create table participant (
    id         uuid primary key,
    reunion_id uuid         not null references reunion (id) on delete cascade,
    nom        varchar(200),
    email      varchar(255),
    role       varchar(20)  not null,
    reponse    varchar(20)  not null,
    facultatif boolean      not null default false
);
create index idx_participant_reunion on participant (reunion_id);

-- Plages hebdomadaires où le client accepte des entretiens (heure locale du Maroc).
create table disponibilite (
    id            uuid primary key,
    entreprise_id uuid    not null,
    jour          integer not null check (jour between 1 and 7),
    heure_debut   time    not null,
    heure_fin     time    not null
);
create index idx_disponibilite_entreprise on disponibilite (entreprise_id);

-- Grille commune remplie après l'entretien : 4 critères de 1 à 5 et une décision.
create table evaluation (
    id                uuid primary key,
    reunion_id        uuid        not null unique references reunion (id) on delete cascade,
    technique         integer     not null check (technique between 1 and 5),
    communication     integer     not null check (communication between 1 and 5),
    motivation        integer     not null check (motivation between 1 and 5),
    adequation_equipe integer     not null check (adequation_equipe between 1 and 5),
    decision          varchar(30) not null,
    commentaire       text,
    auteur            varchar(255),
    created_at        timestamptz not null default now()
);
