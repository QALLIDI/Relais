create table notification (
    id           uuid primary key,
    destinataire varchar(255) not null,
    titre        varchar(300) not null,
    message      text,
    type         varchar(60),
    lu           boolean not null default false,
    email_envoye boolean not null default false,
    created_at   timestamp with time zone not null default now()
);

create index idx_notification_destinataire on notification (lower(destinataire), created_at desc);
