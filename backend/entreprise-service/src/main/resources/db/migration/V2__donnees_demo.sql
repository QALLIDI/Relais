-- Données de démonstration. L'identifiant d'Atlas Digital est repris dans le realm Keycloak
-- (attribut entrepriseId du compte client.atlas).
insert into entreprise (id, raison_sociale, ice, secteur, ville, taille, taux_honoraires, modele_tarif, acompte)
values ('11111111-1111-1111-1111-111111111111', 'Atlas Digital', '001234567000089', 'Services numériques', 'Casablanca', '50-200', 15.00, 'ACOMPTE_ET_SOLDE', 10000),
       ('22222222-2222-2222-2222-222222222222', 'Oasis Santé', '002345678000012', 'Santé', 'Casablanca', '200-500', 18.00, 'POURCENTAGE', null),
       ('33333333-3333-3333-3333-333333333333', 'Médina Retail', '003456789000045', 'Distribution', 'Rabat', '500+', 15.00, 'ACOMPTE_ET_SOLDE', 10000);

insert into contact (id, entreprise_id, nom, fonction, email, telephone)
values ('a1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Samir Kettani', 'DRH', 'client.atlas@recrutement.local', '+212 600 000 001'),
       ('a2222222-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Leila Mansouri', 'Responsable RH', 'rh@oasis-sante.local', '+212 600 000 002'),
       ('a3333333-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Karim Bennani', 'Directeur data', 'data@medina-retail.local', '+212 600 000 003');

insert into mission (id, entreprise_id, intitule, description, type_contrat, ville, teletravail, nb_postes, experience_min, salaire_min, salaire_max, date_limite, priorite, statut, ouverture_notifiee)
values ('b1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Développeur Java senior', 'Concevoir les API du nouveau parcours client au sein de l''équipe produit.', 'CDI', 'Casablanca', 'Hybride', 1, 5, 240000, 300000, current_date + 20, 'Haute', 'OUVERTE', true),
       ('b2222222-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Comptable confirmé', 'Tenue de la comptabilité générale et déclarations fiscales.', 'CDI', 'Casablanca', 'Sur site', 1, 3, 120000, 160000, current_date + 10, 'Normale', 'OUVERTE', true),
       ('b3333333-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Data analyst', 'Tableaux de bord commerciaux et analyses des ventes.', 'CDI', 'Rabat', 'Hybride', 1, 2, 150000, 200000, current_date + 30, 'Normale', 'OUVERTE', true),
       ('b4444444-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Designer UX', 'Refonte de l''application mobile.', 'CDI', 'Casablanca', 'Hybride', 1, 3, null, null, null, 'Normale', 'EN_VALIDATION', false);

insert into mission_competence (mission_id, competence)
values ('b1111111-0000-0000-0000-000000000001', 'Java'),
       ('b1111111-0000-0000-0000-000000000001', 'Spring Boot'),
       ('b1111111-0000-0000-0000-000000000001', 'React'),
       ('b1111111-0000-0000-0000-000000000001', 'PostgreSQL'),
       ('b2222222-0000-0000-0000-000000000001', 'Sage'),
       ('b2222222-0000-0000-0000-000000000001', 'Fiscalité'),
       ('b3333333-0000-0000-0000-000000000001', 'SQL'),
       ('b3333333-0000-0000-0000-000000000001', 'Power BI'),
       ('b3333333-0000-0000-0000-000000000001', 'Python'),
       ('b4444444-0000-0000-0000-000000000001', 'Figma');

insert into mission_competence_souhaitee (mission_id, competence)
values ('b1111111-0000-0000-0000-000000000001', 'Kafka');
