-- Évaluations techniques intégrées (DAT, section 15) : banque de questions, modèles de test ou de grille,
-- évaluations envoyées aux candidats avec une copie figée des questions, et signaux d'intégrité.

-- Types : QCM (une réponse), QCM_MULTI (plusieurs), CODE (« que va afficher ce code ? »), COURTE, OUVERTE.
-- choix : une option par ligne. attendues : indices des bonnes options séparés par des virgules (QCM, QCM_MULTI,
-- CODE) ou réponses acceptées séparées par | (COURTE) ; vide pour OUVERTE, notée par le recruteur.
create table eval_question (
    id           uuid primary key,
    type         varchar(20)  not null,
    enonce       text         not null,
    code         text,
    langage      varchar(30),
    choix        text,
    attendues    text,
    indice       text,
    explication  text,
    competence   varchar(60)  not null,
    niveau       varchar(20)  not null,
    points       integer      not null default 1,
    plateforme   boolean      not null default false,
    auteur       varchar(160),
    active       boolean      not null default true,
    utilisations integer      not null default 0,
    created_at   timestamp with time zone not null default now()
);
create index idx_eval_question_competence on eval_question (competence, niveau) where active;

-- Mode TEST (passé seul en ligne) ou GRILLE (entretien en direct noté par le recruteur).
create table eval_modele (
    id                  uuid primary key,
    mode                varchar(10)  not null,
    intitule            varchar(160) not null,
    competences         varchar(400),
    duree_minutes       integer,
    seuil               integer      not null default 70,
    delai_jours         integer      not null default 5,
    melanger            boolean      not null default true,
    indices             boolean      not null default false,
    score_visible       boolean      not null default true,
    plein_ecran         boolean      not null default true,
    signaux             boolean      not null default true,
    alerte_sorties      integer      not null default 2,
    alerte_secondes     integer      not null default 15,
    auteur              varchar(160),
    utilisations        integer      not null default 0,
    created_at          timestamp with time zone not null default now()
);

-- Contenu d'un modèle : une question fixe, un tirage au hasard (compétence, niveau, nombre)
-- ou, pour une grille, un critère (libellé, questions guides une par ligne, pondération).
create table eval_modele_element (
    id          uuid primary key,
    modele_id   uuid        not null references eval_modele (id) on delete cascade,
    ordre       integer     not null,
    question_id uuid references eval_question (id),
    competence  varchar(60),
    niveau      varchar(20),
    nombre      integer,
    libelle     varchar(200),
    guides      text,
    poids       integer
);
create index idx_eval_element_modele on eval_modele_element (modele_id, ordre);

create table evaluation (
    id                 uuid primary key,
    candidature_id     uuid         not null references candidature (id) on delete cascade,
    modele_id          uuid references eval_modele (id) on delete set null,
    mode               varchar(10)  not null,
    intitule           varchar(160) not null,
    statut             varchar(20)  not null,
    duree_minutes      integer,
    seuil              integer      not null,
    indices            boolean      not null,
    score_visible      boolean      not null,
    plein_ecran        boolean      not null,
    signaux            boolean      not null,
    alerte_sorties     integer      not null,
    alerte_secondes    integer      not null,
    message            text,
    date_limite        date,
    envoyee_le         timestamp with time zone not null default now(),
    debut              timestamp with time zone,
    fin                timestamp with time zone,
    score              integer,
    scores_competences varchar(600),
    commentaire        text
);
create index idx_evaluation_candidature on evaluation (candidature_id);

-- Copie figée de chaque question (ou critère de grille) au moment de l'envoi, et la réponse.
create table evaluation_question (
    id             uuid primary key,
    evaluation_id  uuid        not null references evaluation (id) on delete cascade,
    ordre          integer     not null,
    type           varchar(20) not null,
    enonce         text        not null,
    code           text,
    langage        varchar(30),
    choix          text,
    attendues      text,
    indice         text,
    explication    text,
    competence     varchar(60) not null,
    points         integer     not null,
    reponse        text,
    correcte       boolean,
    points_obtenus numeric(6, 2),
    temps_ms       bigint,
    repondu_le     timestamp with time zone,
    a_verifier     boolean     not null default false
);
create index idx_eval_q_evaluation on evaluation_question (evaluation_id, ordre);

-- Signaux d'intégrité : ONGLET, FENETRE, PLEIN_ECRAN, COPIE, COLLAGE.
create table evaluation_evenement (
    id            uuid primary key,
    evaluation_id uuid        not null references evaluation (id) on delete cascade,
    ordre         integer,
    type          varchar(20) not null,
    debut         timestamp with time zone not null,
    duree_ms      bigint,
    longueur      integer
);
create index idx_eval_evenement on evaluation_evenement (evaluation_id);
