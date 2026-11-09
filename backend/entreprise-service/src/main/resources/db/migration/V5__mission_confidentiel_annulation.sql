-- Recrutement confidentiel (nom du client tu aux candidats) et motif d'annulation d'une mission.
alter table mission add column confidentiel boolean not null default false;
alter table mission add column motif_annulation varchar(500);
