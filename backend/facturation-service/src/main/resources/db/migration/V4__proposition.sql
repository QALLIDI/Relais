-- Propositions commerciales envoyées aux entreprises : formule, acompte, garantie ; acceptées en ligne par le client.
create table proposition (
    id              uuid primary key,
    entreprise_id   uuid not null,
    entreprise_nom  varchar(255) not null,
    contact_email   varchar(255),
    poste           varchar(200),
    formule         varchar(20) not null,
    taux            numeric(5, 2),
    montant         numeric(12, 2),
    acompte_pct     integer not null default 0,
    garantie_mois   integer not null default 0,
    statut          varchar(20) not null,
    motif_refus     varchar(500),
    envoyee_le      timestamp with time zone not null default now(),
    repondue_le     timestamp with time zone
);
create index idx_proposition_entreprise on proposition (entreprise_id, envoyee_le desc);
