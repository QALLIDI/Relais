create table candidature (
    id                     uuid primary key,
    mission_id             uuid not null,
    entreprise_id          uuid,
    mission_intitule       varchar(255),
    entreprise_nom         varchar(255),
    contact_email          varchar(255),
    candidat_id            uuid not null,
    candidat_nom           varchar(200),
    candidat_email         varchar(255),
    candidat_titre         varchar(200),
    candidat_experience    integer not null default 0,
    candidat_ville         varchar(120),
    candidat_competences   varchar(1000),
    candidat_disponibilite varchar(60),
    candidat_pretention    numeric(12, 2),
    etape                  varchar(30) not null,
    etape_max              varchar(30),
    score                  integer not null default 0,
    motif_sortie           varchar(500),
    note_globale           integer,
    synthese               text,
    avis_client            varchar(20),
    commentaire_client     text,
    presente_le            timestamp with time zone,
    place_le               timestamp with time zone,
    date_embauche          date,
    salaire_annuel         numeric(12, 2),
    created_at             timestamp with time zone not null default now(),
    updated_at             timestamp with time zone not null default now(),
    constraint uk_candidature_mission_candidat unique (mission_id, candidat_id)
);

create table entretien (
    id             uuid primary key,
    candidature_id uuid not null references candidature (id) on delete cascade,
    date_heure     timestamp with time zone not null,
    type           varchar(20),
    lieu           varchar(255),
    statut         varchar(20),
    compte_rendu   text,
    created_at     timestamp with time zone not null default now()
);

create index idx_candidature_mission on candidature (mission_id);
create index idx_candidature_entreprise on candidature (entreprise_id);
create index idx_candidature_email on candidature (lower(candidat_email));
create index idx_entretien_date on entretien (date_heure);
