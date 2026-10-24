create table candidat (
    id                 uuid primary key,
    keycloak_user_id   varchar(64) unique,
    nom_complet        varchar(200) not null,
    email              varchar(255),
    telephone          varchar(40),
    titre              varchar(200),
    annees_experience  integer not null default 0,
    niveau             varchar(20),
    secteur            varchar(120),
    ville              varchar(120),
    mobilite           varchar(200),
    disponibilite      varchar(20),
    pretention_salaire numeric(12, 2),
    langues            varchar(200),
    source             varchar(80),
    consentement_le    date,
    cv_object_key      varchar(400),
    cv_nom_fichier     varchar(255),
    anonymise          boolean not null default false,
    created_at         timestamp with time zone not null default now(),
    updated_at         timestamp with time zone not null default now()
);

create table candidat_competence (
    candidat_id uuid not null references candidat (id) on delete cascade,
    competence  varchar(120) not null
);

create table candidat_experience (
    candidat_id uuid not null references candidat (id) on delete cascade,
    position    integer not null,
    periode     varchar(60),
    poste       varchar(200),
    employeur   varchar(200),
    description text,
    primary key (candidat_id, position)
);

create table note (
    id          uuid primary key,
    candidat_id uuid not null references candidat (id) on delete cascade,
    auteur      varchar(200),
    texte       text not null,
    created_at  timestamp with time zone not null default now()
);

create index idx_candidat_email on candidat (lower(email));
create index idx_candidat_competence on candidat_competence (lower(competence));
