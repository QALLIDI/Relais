-- Suite donnée par le recruteur à une demande de rattachement : entreprise choisie et date de traitement.
alter table demande_rattachement add column entreprise_id uuid;
alter table demande_rattachement add column traitee_le timestamp with time zone;
