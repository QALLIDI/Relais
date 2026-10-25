-- Reprise des entretiens de démonstration de selection-service (mêmes identifiants).
insert into reunion (id, candidature_id, mission_id, entreprise_id, mission_intitule, entreprise_nom, candidat_id,
                     candidat_nom, candidat_email, contact_email, nature, type, duree_minutes, statut, lieu,
                     lien_visio, debut, fin, proposee_par, created_at, updated_at)
values
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000006', 'b3333333-0000-0000-0000-000000000001',
   '33333333-3333-3333-3333-333333333333', 'Data analyst', 'Médina Retail', 'c0000000-0000-0000-0000-000000000007',
   'Salma E.', 'salma.e@exemple.ma', 'data@medina-retail.local', 'ENTRETIEN_CLIENT', 'VISIO', 60, 'CONFIRMEE', 'Visio',
   'https://meet.jit.si/Recrut-e0000000', date_trunc('hour', now()) + interval '1 day',
   date_trunc('hour', now()) + interval '1 day 1 hour', 'recruteur@recrutement.local',
   now() - interval '4 days', now() - interval '4 days'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003', 'b1111111-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111', 'Développeur Java senior', 'Atlas Digital', 'c0000000-0000-0000-0000-000000000001',
   'Nadia F.', 'nadia.f@exemple.ma', 'client.atlas@recrutement.local', 'ENTRETIEN_RECRUTEUR', 'TELEPHONE', 30, 'CONFIRMEE',
   'Téléphone', null, date_trunc('hour', now()) + interval '1 day 4 hours',
   date_trunc('hour', now()) + interval '1 day 4 hours 30 minutes', 'recruteur@recrutement.local',
   now() - interval '1 day', now() - interval '1 day');

insert into creneau (id, reunion_id, debut, fin, choisi)
select gen_random_uuid(), id, debut, fin, true from reunion;

insert into participant (id, reunion_id, nom, email, role, reponse)
values (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001', 'Salma E.', 'salma.e@exemple.ma', 'CANDIDAT', 'ACCEPTE'),
       (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001', 'Médina Retail', 'data@medina-retail.local', 'CLIENT', 'ACCEPTE'),
       (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001', 'Votre recruteur', 'recruteur@recrutement.local', 'RECRUTEUR', 'ACCEPTE'),
       (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000002', 'Nadia F.', 'nadia.f@exemple.ma', 'CANDIDAT', 'ACCEPTE'),
       (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000002', 'Votre recruteur', 'recruteur@recrutement.local', 'RECRUTEUR', 'ACCEPTE');

-- Disponibilités d'Atlas Digital pour les entretiens (lundi, mercredi, vendredi).
insert into disponibilite (id, entreprise_id, jour, heure_debut, heure_fin)
values (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 1, '10:00', '12:00'),
       (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 3, '09:00', '12:00'),
       (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 5, '14:00', '17:00');
