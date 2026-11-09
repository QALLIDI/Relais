-- Consentements détaillés du candidat (page « Mes données »).
alter table candidat add column consentement_vivier boolean not null default true;
alter table candidat add column consentement_actualites boolean not null default false;
