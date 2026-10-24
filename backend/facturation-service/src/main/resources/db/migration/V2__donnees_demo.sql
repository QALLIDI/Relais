-- Historique de facturation de démonstration (acomptes et un placement payé).
insert into placement (id, candidature_id, mission_id, entreprise_id, entreprise_nom, mission_intitule, candidat_id,
                       candidat_nom, salaire_annuel, taux_honoraires, date_embauche, fin_garantie, contact_email, created_at)
values ('f1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-0000000000aa', null,
        '22222222-2222-2222-2222-222222222222', 'Oasis Santé', 'Contrôleur de gestion', null, 'Imane K.',
        200000, 18, current_date - 60, current_date + 30, 'rh@oasis-sante.local', now() - interval '65 days');

insert into facture (id, numero, entreprise_id, entreprise_nom, contact_email, objet, placement_id, montant_ht, taux_tva,
                     montant_tva, montant_ttc, statut, date_emission, echeance, date_paiement)
values ('f2000000-0000-0000-0000-000000000001', 'F-2026-001', '22222222-2222-2222-2222-222222222222', 'Oasis Santé',
        'rh@oasis-sante.local', 'Placement · Contrôleur de gestion · Imane K.', 'f1000000-0000-0000-0000-000000000001',
        36000, 20, 7200, 43200, 'PAYEE', current_date - 58, current_date - 28, current_date - 30),
       ('f2000000-0000-0000-0000-000000000002', 'F-2026-002', '11111111-1111-1111-1111-111111111111', 'Atlas Digital',
        'client.atlas@recrutement.local', 'Acompte · Développeur Java senior', null,
        10000, 20, 2000, 12000, 'PAYEE', current_date - 18, current_date + 12, current_date - 5),
       ('f2000000-0000-0000-0000-000000000003', 'F-2026-003', '33333333-3333-3333-3333-333333333333', 'Médina Retail',
        'data@medina-retail.local', 'Acompte · Data analyst', null,
        10000, 20, 2000, 12000, 'EMISE', current_date - 40, current_date - 10, null);

select setval('facture_numero_seq', 3);
