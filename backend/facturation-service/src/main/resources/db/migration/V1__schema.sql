create sequence facture_numero_seq start with 1;

create table placement (
    id               uuid primary key,
    candidature_id   uuid not null unique,
    mission_id       uuid,
    entreprise_id    uuid,
    entreprise_nom   varchar(255),
    mission_intitule varchar(255),
    candidat_id      uuid,
    candidat_nom     varchar(200),
    salaire_annuel   numeric(12, 2),
    taux_honoraires  numeric(5, 2),
    date_embauche    date,
    fin_garantie     date,
    contact_email    varchar(255),
    created_at       timestamp with time zone not null default now()
);

create table facture (
    id             uuid primary key,
    numero         varchar(30) unique,
    entreprise_id  uuid not null,
    entreprise_nom varchar(255),
    contact_email  varchar(255),
    objet          varchar(500) not null,
    placement_id   uuid references placement (id),
    montant_ht     numeric(12, 2),
    taux_tva       numeric(5, 2),
    montant_tva    numeric(12, 2),
    montant_ttc    numeric(12, 2),
    statut         varchar(20) not null,
    date_emission  date,
    echeance       date,
    date_paiement  date,
    created_at     timestamp with time zone not null default now()
);

create index idx_facture_entreprise on facture (entreprise_id);
