/**
 * Textes des pages légales, repris du document « Pages légales — modèles Recrut ».
 * MODÈLES À FAIRE VALIDER PAR UN AVOCAT AVANT PUBLICATION (loi 09-08 / CNDP, loi 31-08, loi 53-05, Code du travail).
 * Les passages entre crochets [ … ] sont à compléter : ils sont surlignés à l'écran tant qu'ils restent.
 * Mise en forme : **gras** ; un paragraphe par chaîne.
 */

export type Bloc =
  | { t: 'p'; x: string }
  | { t: 'h'; x: string }
  | { t: 'ul'; items: string[] }
  | { t: 'table'; tete: string[]; lignes: string[][] }
  | { t: 'note'; x: string };

export type PageLegale = { slug: string; titre: string; court: string; resume: string; maj?: string; blocs: Bloc[] };

const MAJ = '[date de mise à jour]';

export const PAGES_LEGALES: PageLegale[] = [
  {
    slug: 'mentions-legales',
    titre: 'Mentions légales',
    court: 'Mentions légales',
    resume: 'Qui édite Recrut, comment nous joindre et où le site est hébergé.',
    blocs: [
      { t: 'p', x: "**Éditeur.** Le site recrut.ma et la plateforme Recrut sont édités par [Raison sociale], [forme juridique] au capital de [capital] dirhams, dont le siège est situé [adresse du siège], Casablanca, Maroc." },
      { t: 'p', x: '**Identifiants.** RC [RC] · ICE [ICE] · IF [IF] · Patente [patente].' },
      { t: 'p', x: "**Activité.** Cabinet de présélection et de recrutement exerçant en qualité d'agence de recrutement privée, agréée sous le numéro [numéro d'agrément]. Conformément au Code du travail, aucun frais n'est demandé aux candidats." },
      { t: 'p', x: '**Directeur de la publication.** [Nom, qualité].' },
      { t: 'p', x: '**Contact.** [e-mail de contact] · [téléphone].' },
      { t: 'p', x: '**Hébergement.** [Hébergeur, adresse et pays]. Contenus distribués via Cloudflare, Inc. (réseau mondial).' },
      { t: 'p', x: "**Propriété intellectuelle.** Le nom Recrut, le logo, les textes et la plateforme sont protégés. Toute reproduction sans autorisation écrite est interdite. La police Inter est utilisée sous licence SIL Open Font License." },
    ],
  },
  {
    slug: 'confidentialite',
    titre: 'Politique de confidentialité',
    court: 'Confidentialité',
    resume: 'Quelles données nous traitons, pourquoi, combien de temps, et comment exercer vos droits.',
    maj: MAJ,
    blocs: [
      { t: 'p', x: "[Raison sociale] (« Recrut », « nous ») est responsable des traitements de données personnelles réalisés sur la plateforme. Ces traitements sont déclarés à la Commission nationale de contrôle de la protection des données à caractère personnel (CNDP) sous le numéro [numéro de déclaration CNDP], conformément à la loi 09-08." },
      { t: 'h', x: 'Pourquoi nous traitons vos données' },
      { t: 'table', tete: ['Personnes', 'Finalité', 'Base'], lignes: [
        ['Candidats', "Créer votre profil, vous proposer des missions, organiser vos entretiens, vous informer de l'avancement", "Votre consentement, donné à l'inscription et modifiable à tout moment"],
        ['Contacts des entreprises', 'Réaliser la mission de recrutement, facturer, suivre la relation', 'Le contrat de prestation'],
        ['Visiteurs du site', "Répondre à une demande de rappel ; mesurer l'audience si vous l'acceptez", 'Votre consentement'],
        ['Personnes citées en référence', 'Recueillir un avis professionnel sur un candidat, à sa demande', 'Le consentement du candidat et le vôtre'],
      ] },
      { t: 'h', x: 'Les données que nous collectons' },
      { t: 'ul', items: [
        'Identité et coordonnées : nom, prénom, e-mail, téléphone, ville.',
        'Parcours professionnel : CV, expériences, diplômes, compétences, langues, disponibilité, prétentions salariales.',
        'Présélection : réponses au questionnaire, résultat de test technique, références, évaluations des entretiens.',
        "Si vous la déposez : une vidéo de présentation d'une minute au plus.",
        'Données de connexion et de sécurité : journaux techniques, adresse IP.',
      ] },
      { t: 'p', x: "Nous ne demandons jamais de photo, d'âge précis, de situation familiale, de numéro de carte d'identité, ni de donnée sensible (santé, religion, opinions)." },
      { t: 'h', x: 'Qui y a accès' },
      { t: 'ul', items: [
        "L'équipe Recrut.",
        "Les entreprises clientes, uniquement pour les missions auxquelles vous participez, et seulement après votre accord. Si un recrutement est confidentiel, le nom de l'entreprise vous est révélé avant l'entretien.",
        "Nos sous-traitants techniques : hébergement, envoi d'e-mails et de SMS, agenda et visio, signature électronique, assistant de rédaction. Ils agissent sur nos instructions et sont tenus à la confidentialité.",
      ] },
      { t: 'p', x: 'Certains sous-traitants sont situés hors du Maroc. Ces transferts sont encadrés [par l\'autorisation CNDP n° [numéro] / vers des pays assurant une protection suffisante].' },
      { t: 'h', x: 'Combien de temps' },
      { t: 'ul', items: [
        'Profil candidat : tant que votre compte est actif. Nous vous demandons tous les 6 mois si vous cherchez toujours ; sans réponse sous 30 jours, votre profil est mis en pause, et il est anonymisé après 24 mois sans activité.',
        "Vidéo : jusqu'à ce que vous la supprimiez, ou que vous supprimiez votre compte.",
        "Demandes de rappel non suivies d'un contrat : 12 mois.",
        'Données des entreprises : la durée de la relation, puis [durée] ; les factures, pendant la durée légale de conservation des pièces comptables.',
        'Journaux techniques : 12 mois.',
      ] },
      { t: 'p', x: "**Sécurité.** Connexions chiffrées, mots de passe jamais stockés en clair, double authentification pour l'équipe, fichiers privés accessibles par liens temporaires, numéros masqués dans les journaux, sauvegardes chiffrées." },
      { t: 'p', x: "**Vos droits.** Vous pouvez accéder à vos données, les rectifier, vous opposer à leur traitement pour un motif légitime ou à toute prospection, et demander leur suppression. Depuis votre espace (rubrique « Mes données ») ou par e-mail à [e-mail dédié aux données personnelles]. Réponse sous 30 jours au plus. Vous pouvez aussi saisir la CNDP (www.cndp.ma)." },
    ],
  },
  {
    slug: 'cgu',
    titre: "Conditions générales d'utilisation",
    court: 'CGU',
    resume: 'Les règles d’utilisation de la plateforme pour les candidats et les entreprises.',
    maj: MAJ,
    blocs: [
      { t: 'p', x: "**Objet.** Les présentes conditions règlent l'utilisation de la plateforme Recrut par les candidats, les entreprises clientes et leurs équipes. Les entreprises sont en plus liées par le contrat de prestation signé en ligne, qui prévaut en cas de contradiction." },
      { t: 'p', x: "**Accès.** La plateforme est réservée aux personnes de 18 ans ou plus. L'inscription demande un e-mail valide, un numéro de téléphone vérifié par SMS et l'activation par e-mail. Chaque compte est personnel : vous êtes responsable de la confidentialité de vos identifiants." },
      { t: 'h', x: 'Engagements des candidats' },
      { t: 'ul', items: [
        'Le service est gratuit pour les candidats.',
        'Vous fournissez des informations exactes et à jour (expériences, diplômes, disponibilité).',
        'Vous ne créez qu’un seul profil.',
        "La vidéo et les références ne sont partagées qu'avec votre accord.",
      ] },
      { t: 'h', x: 'Engagements des entreprises' },
      { t: 'ul', items: [
        "Les profils reçus sont confidentiels et ne servent qu'au recrutement concerné. Ils ne peuvent être ni copiés, ni transmis à un tiers, ni utilisés pour un autre poste sans passer par Recrut.",
        'Un candidat présenté par Recrut et embauché dans les [12] mois suivant sa présentation donne lieu à facturation, conformément au contrat.',
        "L'administrateur du compte gère les accès de son équipe et reste responsable de leur usage.",
      ] },
      { t: 'p', x: "**Usages interdits.** Contenus faux, discriminatoires ou illégaux ; collecte automatisée des données ; contournement de la sécurité ; usurpation d'identité." },
      { t: 'p', x: "**Disponibilité et responsabilité.** Nous faisons notre possible pour que la plateforme soit disponible et sûre, sans pouvoir garantir une absence totale d'interruption. Recrut accompagne la présélection ; la décision d'embauche appartient à l'entreprise." },
      { t: 'p', x: "**Suspension et fermeture.** Nous pouvons suspendre un compte en cas de manquement, après vous en avoir informé sauf urgence. Vous pouvez fermer votre compte à tout moment depuis la rubrique « Mes données »." },
      { t: 'p', x: "**Modification.** Toute modification importante vous est annoncée au moins 30 jours avant son entrée en vigueur." },
      { t: 'p', x: "**Droit applicable.** Droit marocain. À défaut d'accord amiable, compétence des tribunaux de Casablanca, sous réserve des règles protectrices du consommateur (loi 31-08)." },
    ],
  },
  {
    slug: 'conditions-commerciales',
    titre: 'Acompte, remboursement et garantie',
    court: 'Conditions commerciales',
    resume: 'Prix, acompte, annulation et garantie de remplacement pour les entreprises.',
    maj: MAJ,
    blocs: [
      { t: 'p', x: "**Prix.** Les prix sont indiqués hors taxes dans la proposition commerciale, avec le montant TTC. Aucun frais n'est ajouté en dehors de la proposition signée." },
      { t: 'p', x: "**Acompte (formule forfait).** Un acompte de 30 % du forfait est facturé à l'ouverture de la mission. La recherche démarre à son paiement. L'acompte est déduit de la facture finale." },
      { t: 'p', x: "**Si vous annulez la mission.** [Règle à choisir, par exemple : avant l'envoi de la première shortlist, l'acompte est remboursé déduction faite de [montant] de frais de dossier ; après l'envoi d'une shortlist, il reste acquis.]" },
      { t: 'p', x: "**Si aucun profil ne vous convient.** [Règle à choisir, par exemple : nous poursuivons la recherche sans frais supplémentaires ; si aucun profil n'est retenu après [3] shortlists, l'acompte est remboursé intégralement.]" },
      { t: 'p', x: "**Garantie de remplacement.** Si la personne recrutée quitte l'entreprise, ou si l'entreprise met fin à la période d'essai, dans un délai de [durée] après son arrivée, Recrut relance la recherche sans frais, sur les mêmes critères. La garantie ne s'applique pas en cas de licenciement économique, de modification importante du poste, ou de facture impayée. Elle se déclare depuis l'espace entreprise." },
      { t: 'p', x: "**Abonnement.** Sans engagement au-delà du mois en cours, résiliable avant la date de renouvellement ; le mois commencé reste dû." },
      { t: 'p', x: '**Réclamations.** À [e-mail de contact] ; réponse sous 15 jours ouvrés.' },
    ],
  },
  {
    slug: 'cookies',
    titre: 'Politique cookies',
    court: 'Cookies',
    resume: 'Les rares cookies que nous utilisons et comment changer votre choix.',
    maj: MAJ,
    blocs: [
      { t: 'p', x: 'Un cookie est un petit fichier enregistré par votre navigateur. Nous en utilisons très peu.' },
      { t: 'table', tete: ['Catégorie', 'Exemples', 'Durée', 'Votre accord'], lignes: [
        ['Nécessaires', 'Session de connexion, sécurité, mémorisation du choix cookies et du thème', 'Session à 6 mois', 'Non requis : sans eux, le site ne fonctionne pas'],
        ["Mesure d'audience", 'Pages vues, de façon anonyme [outil retenu]', '13 mois au plus', 'Oui, refusable en un clic'],
        ['Publicité', 'Aucune', '—', '—'],
      ] },
      { t: 'p', x: "Avant votre choix, seuls les cookies nécessaires sont déposés. « Tout refuser » est aussi accessible que « Tout accepter ». Votre choix est conservé 6 mois, puis redemandé. Vous pouvez le changer à tout moment par le lien « Gérer les cookies » en bas de chaque page." },
    ],
  },
];

export const pageLegale = (slug: string) => PAGES_LEGALES.find((p) => p.slug === slug);
export const CHEMINS_LEGAUX = PAGES_LEGALES.map((p) => '/' + p.slug);
