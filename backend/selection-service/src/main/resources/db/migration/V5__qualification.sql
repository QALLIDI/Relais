-- Préqualification : tests techniques envoyés au candidat et références demandées à ses anciens collègues.
create table test_technique (
    id             uuid primary key,
    candidature_id uuid not null references candidature (id) on delete cascade,
    intitule       varchar(160) not null,
    duree_minutes  integer,
    lien           varchar(500),
    message        text,
    date_limite    date,
    statut         varchar(20) not null,
    score          integer,
    commentaire    text,
    envoye_le      timestamp with time zone not null default now(),
    corrige_le     timestamp with time zone
);
create index idx_test_candidature on test_technique (candidature_id);

create table reference_candidat (
    id             uuid primary key,
    candidature_id uuid not null references candidature (id) on delete cascade,
    nom            varchar(160) not null,
    email          varchar(255),
    telephone      varchar(40),
    fonction       varchar(200),
    lien           varchar(30) not null,
    statut         varchar(20) not null,
    avis           text,
    recommande     boolean,
    demandee_le    timestamp with time zone not null default now(),
    relancee_le    timestamp with time zone,
    recue_le       timestamp with time zone
);
create index idx_reference_candidature on reference_candidat (candidature_id);

-- Résumé recopié sur la candidature (pipeline, shortlist, comparateur).
alter table candidature
    add column score_test           integer,
    add column references_demandees integer not null default 0,
    add column references_recues    integer not null default 0;
