-- Outbox transactionnelle (événements à publier dans Kafka) et événements déjà traités (idempotence).
create table outbox (
    id        uuid primary key,
    topic     varchar(100) not null,
    cle       varchar(100),
    type      varchar(100) not null,
    payload   jsonb not null,
    cree_le   timestamptz not null default now(),
    publie_le timestamptz
);
create index outbox_a_publier on outbox (cree_le) where publie_le is null;

create table evenement_traite (
    id        uuid primary key,
    traite_le timestamptz not null default now()
);
