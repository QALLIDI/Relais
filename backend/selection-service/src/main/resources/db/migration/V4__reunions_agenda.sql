-- Les entretiens passent dans agenda-service (base agenda_db, données de démo reprises là-bas).
drop table entretien;

-- Évaluation structurée reçue d'agenda-service après un entretien client.
alter table candidature
    add column eval_technique     integer,
    add column eval_communication integer,
    add column eval_motivation    integer,
    add column eval_equipe        integer,
    add column eval_decision      varchar(30);
