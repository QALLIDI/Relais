create table entreprise (
    id              uuid primary key,
    raison_sociale  varchar(255) not null,
    ice             varchar(30),
    secteur         varchar(120),
    ville           varchar(120),
    taille          varchar(60),
    taux_honoraires numeric(5, 2),
    modele_tarif    varchar(30),
    acompte         numeric(12, 2),
    created_at      timestamp with time zone not null default now()
);

create table contact (
    id               uuid primary key,
    entreprise_id    uuid not null references entreprise (id) on delete cascade,
    nom              varchar(160) not null,
    fonction         varchar(160),
    email            varchar(255) not null,
    telephone        varchar(40),
    keycloak_user_id varchar(64)
);

create table mission (
    id                 uuid primary key,
    entreprise_id      uuid not null references entreprise (id),
    intitule           varchar(255) not null,
    description        text,
    type_contrat       varchar(30),
    ville              varchar(120),
    teletravail        varchar(30),
    nb_postes          integer,
    experience_min     integer,
    salaire_min        numeric(12, 2),
    salaire_max        numeric(12, 2),
    date_limite        date,
    priorite           varchar(20),
    statut             varchar(20) not null,
    ouverture_notifiee boolean not null default false,
    created_at         timestamp with time zone not null default now()
);

create table mission_competence (
    mission_id uuid not null references mission (id) on delete cascade,
    competence varchar(120) not null
);

create table mission_competence_souhaitee (
    mission_id uuid not null references mission (id) on delete cascade,
    competence varchar(120) not null
);

create index idx_mission_entreprise on mission (entreprise_id);
create index idx_mission_statut on mission (statut);
