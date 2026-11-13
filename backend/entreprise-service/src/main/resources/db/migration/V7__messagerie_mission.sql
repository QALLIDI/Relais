-- Échanges recruteur ↔ entreprise sur une mission.
create table message_mission (
    id             uuid primary key,
    mission_id     uuid not null references mission (id) on delete cascade,
    entreprise_id  uuid not null,
    auteur_id      varchar(64) not null,
    auteur_nom     varchar(200) not null,
    auteur_role    varchar(20) not null,
    contenu        text not null,
    cree_le        timestamp with time zone not null default now()
);
create index idx_message_mission on message_mission (mission_id, cree_le);
create index idx_message_entreprise on message_mission (entreprise_id, cree_le);

-- Jusqu'où chaque utilisateur a lu le fil d'une mission.
create table lecture_message (
    id              uuid primary key,
    mission_id      uuid not null references mission (id) on delete cascade,
    utilisateur_id  varchar(64) not null,
    lu_le           timestamp with time zone not null,
    unique (mission_id, utilisateur_id)
);

-- Regroupement des e-mails : un seul e-mail par côté tant que personne de ce côté n'a ouvert le fil.
create table fil_mission (
    mission_id          uuid primary key references mission (id) on delete cascade,
    attente_recruteur   boolean not null default false,
    attente_entreprise  boolean not null default false
);
