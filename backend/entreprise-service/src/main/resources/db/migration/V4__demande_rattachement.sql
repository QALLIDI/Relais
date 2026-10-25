-- Comptes entreprise créés par l'inscription en ligne, en attente de rattachement à une entreprise par le recruteur.
create table demande_rattachement (
    id               uuid primary key,
    keycloak_user_id varchar(64) not null unique,
    nom              varchar(160) not null,
    email            varchar(255) not null,
    telephone        varchar(40),
    raison_sociale   varchar(255),
    statut           varchar(20) not null default 'EN_ATTENTE',
    created_at       timestamp with time zone not null default now()
);

create index idx_demande_rattachement_statut on demande_rattachement (statut, created_at);
