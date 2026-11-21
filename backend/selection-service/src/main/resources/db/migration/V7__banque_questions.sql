-- Banque de départ fournie par la plateforme (questions marquées plateforme = true).
-- Les recruteurs peuvent en ajouter, et modifier une question de la banque en créant leur propre copie.
insert into eval_question (id, type, enonce, code, langage, choix, attendues, indice, explication, competence, niveau, points, plateforme) values
(gen_random_uuid(), 'CODE', 'On supprime un élément d''une liste pendant qu''on la parcourt. Qu''affiche ce code ?',
 E'List<Integer> l = new ArrayList<>(List.of(1, 2, 3));\nfor (Integer i : l) {\n  if (i == 2) l.remove(i);\n}\nSystem.out.println(l);', 'java',
 E'[1, 3]\nConcurrentModificationException\n[1, 2, 3]\n[1]', '1', 'Que fait l''itérateur quand la liste change pendant le parcours ?',
 'Retirer un élément pendant un for-each modifie la liste sous l''itérateur : l''itération suivante lève ConcurrentModificationException. Il faut passer par Iterator.remove() ou removeIf.', 'Java', 'CONFIRME', 1, true),
(gen_random_uuid(), 'CODE', 'Qu''affiche ce code ?', E'String a = "recrut";\nString b = new String("recrut");\nSystem.out.println((a == b) + " " + a.equals(b));', 'java',
 E'true true\nfalse true\nfalse false\ntrue false', '1', null, '== compare les références (deux objets distincts), equals compare le contenu.', 'Java', 'JUNIOR', 1, true),
(gen_random_uuid(), 'QCM', 'Quelle collection garantit l''unicité des éléments et l''ordre d''insertion ?', null, null,
 E'HashSet\nTreeSet\nLinkedHashSet\nArrayList', '2', null, 'LinkedHashSet garde l''ordre d''insertion ; TreeSet trie, HashSet ne garantit aucun ordre.', 'Java', 'JUNIOR', 1, true),
(gen_random_uuid(), 'QCM_MULTI', 'Parmi ces types, lesquels sont immuables ?', null, null,
 E'String\nStringBuilder\nLocalDate\nArrayList\nInteger', '0,2,4', null, 'String, LocalDate et Integer ne changent jamais après création ; StringBuilder et ArrayList sont modifiables.', 'Java', 'CONFIRME', 2, true),
(gen_random_uuid(), 'QCM', 'Avec Java 21, quel est l''intérêt principal des threads virtuels ?', null, null,
 E'Exécuter du code plus vite sur un seul cœur\nGérer un très grand nombre de tâches bloquantes sans épuiser les threads du système\nRemplacer la synchronisation\nÉviter le ramasse-miettes', '1', null, 'Un thread virtuel bloqué libère son thread porteur : on peut en lancer des centaines de milliers pour des tâches d''entrée-sortie.', 'Java', 'SENIOR', 1, true),
(gen_random_uuid(), 'QCM', 'Une méthode annotée @Transactional est appelée depuis une autre méthode de la même classe. Que se passe-t-il ?', null, null,
 E'La transaction démarre normalement\nL''annotation est ignorée : l''appel ne passe pas par le proxy Spring\nSpring lève une exception au démarrage\nLa transaction est en lecture seule', '1', 'Comment Spring ajoute-t-il le comportement transactionnel ?', 'Spring applique @Transactional par un proxy : un appel interne à la classe ne traverse pas le proxy.', 'Spring Boot', 'SENIOR', 1, true),
(gen_random_uuid(), 'QCM', 'Quelle annotation lie les propriétés app.* d''application.yml à un record Java ?', null, null,
 E'@Value\n@ConfigurationProperties(prefix = "app")\n@PropertySource\n@Bean', '1', null, '@ConfigurationProperties lie tout un préfixe à un objet typé, validable.', 'Spring Boot', 'CONFIRME', 1, true),
(gen_random_uuid(), 'QCM', 'Dans une API REST Spring, quel code HTTP renvoyer après la création d''une ressource ?', null, null,
 E'200 OK\n201 Created\n204 No Content\n202 Accepted', '1', null, '201 Created, idéalement avec l''en-tête Location de la nouvelle ressource.', 'Spring Boot', 'JUNIOR', 1, true),
(gen_random_uuid(), 'COURTE', 'À quoi sert la clé d''un message Kafka ? (en quelques mots)', null, null, null,
 'ordre|garantir l''ordre|même partition|partition|partitionnement', null, 'Les messages d''une même clé vont dans la même partition : leur ordre est garanti.', 'Kafka', 'CONFIRME', 1, true),
(gen_random_uuid(), 'QCM', 'Un consommateur Kafka plante avant de valider son offset. Que se passe-t-il au redémarrage ?', null, null,
 E'Les messages sont perdus\nLes messages non validés sont relus : le traitement doit être idempotent\nKafka supprime la partition\nLe producteur renvoie les messages', '1', null, 'Livraison « au moins une fois » : on relit depuis le dernier offset validé, d''où l''importance de l''idempotence.', 'Kafka', 'SENIOR', 1, true),
(gen_random_uuid(), 'QCM_MULTI', 'Un index composite existe sur (ville, date_naissance). Quelles requêtes peuvent l''utiliser ?', null, null,
 E'WHERE ville = ''Rabat''\nWHERE date_naissance > ''1990-01-01''\nWHERE ville = ''Rabat'' AND date_naissance > ''1990-01-01''\nWHERE ville LIKE ''%bat''', '0,2', 'Pensez à l''ordre des colonnes de l''index.', 'Un index composite sert quand la requête filtre sur sa première colonne ; un LIKE qui commence par % ne peut pas l''utiliser.', 'SQL', 'CONFIRME', 2, true),
(gen_random_uuid(), 'CODE', 'Combien de lignes renvoie cette requête ?', E'-- table t(x) contient : 1, 2, NULL\nSELECT * FROM t WHERE x <> 1;', 'sql',
 E'0\n1\n2\n3', '1', 'Comment se compare NULL ?', 'NULL <> 1 n''est ni vrai ni faux mais inconnu : seule la ligne 2 est renvoyée.', 'SQL', 'CONFIRME', 1, true),
(gen_random_uuid(), 'QCM', 'Quelle jointure garde toutes les lignes de la table de gauche, même sans correspondance ?', null, null,
 E'INNER JOIN\nLEFT JOIN\nCROSS JOIN\nNATURAL JOIN', '1', null, 'LEFT JOIN garde la table de gauche et complète par NULL.', 'SQL', 'JUNIOR', 1, true),
(gen_random_uuid(), 'CODE', 'Un développeur utilise la déstructuration avec une valeur par défaut. Qu''affiche ce code ?',
 E'const { theme = ''dark'' } = { theme: null };\nconsole.log(theme);', 'javascript',
 E'dark\nnull\nundefined\nTypeError', '1', 'La valeur par défaut ne s''applique que si la propriété vaut undefined, pas null.', 'null est une valeur définie : la valeur par défaut n''est pas utilisée.', 'JavaScript', 'CONFIRME', 1, true),
(gen_random_uuid(), 'CODE', 'Qu''affiche ce code ?', E'console.log([1, 2, 3].map(String).join("") + 1);', 'javascript',
 E'7\n1231\n124\nNaN', '1', null, 'map(String) donne ["1","2","3"], join donne "123", puis + 1 concatène : "1231".', 'JavaScript', 'JUNIOR', 1, true),
(gen_random_uuid(), 'QCM', 'Dans quel ordre s''affichent les messages ? console.log(1); setTimeout(() => console.log(2)); Promise.resolve().then(() => console.log(3)); console.log(4);', null, null,
 E'1 2 3 4\n1 4 3 2\n1 4 2 3\n1 3 4 2', '1', 'Microtâches ou macrotâches ?', 'Le code synchrone d''abord (1, 4), puis les microtâches (promesse : 3), puis les tâches (setTimeout : 2).', 'JavaScript', 'SENIOR', 1, true),
(gen_random_uuid(), 'QCM', 'Quelle est la différence entre useMemo et useCallback ?', null, null,
 E'Aucune\nuseMemo mémorise une valeur calculée, useCallback mémorise une fonction\nuseCallback ne s''utilise que dans les classes\nuseMemo déclenche un nouveau rendu', '1', null, 'useCallback(fn, deps) équivaut à useMemo(() => fn, deps).', 'React', 'CONFIRME', 1, true),
(gen_random_uuid(), 'QCM', 'Pourquoi React demande-t-il une prop key sur les éléments d''une liste ?', null, null,
 E'Pour le style CSS\nPour identifier chaque élément entre deux rendus et ne mettre à jour que ceux qui changent\nPour trier la liste\nPour l''accessibilité', '1', null, 'La clé permet à React de faire correspondre les éléments d''un rendu à l''autre ; un index instable crée des bugs d''état.', 'React', 'JUNIOR', 1, true),
(gen_random_uuid(), 'QCM_MULTI', 'Quelles pratiques évitent des rendus inutiles dans une application React ?', null, null,
 E'Découper le state au plus près de son usage\nCréer un nouvel objet de style à chaque rendu dans les props\nReact.memo sur un composant coûteux aux props stables\nTout mettre dans un seul contexte global', '0,2', null, 'Un state local et des props stables limitent les rendus ; un contexte unique fait tout re-rendre à chaque changement.', 'React', 'SENIOR', 2, true),
(gen_random_uuid(), 'OUVERTE', 'Décrivez un incident de production que vous avez résolu : le symptôme, la cause trouvée et ce que vous avez changé pour qu''il ne se reproduise pas.', null, null, null, null, null,
 'Attendu : une démarche (observer, isoler, corriger, prévenir), des faits précis, une leçon tirée.', 'Savoir-être', 'CONFIRME', 3, true),
(gen_random_uuid(), 'OUVERTE', 'Comment expliqueriez-vous un choix technique à une personne non technique de l''équipe client ?', null, null, null, null, null,
 'Attendu : partir du besoin, des mots simples, les conséquences concrètes (délai, coût, risque).', 'Savoir-être', 'JUNIOR', 2, true);

-- Modèles de départ.
insert into eval_modele (id, mode, intitule, competences, duree_minutes, seuil, auteur) values
('00000000-0000-0000-0000-00000000e001', 'TEST', 'Java & Spring · confirmé', 'Java,Spring Boot,SQL', 30, 70, 'Plateforme'),
('00000000-0000-0000-0000-00000000e002', 'TEST', 'Front React · confirmé', 'React,JavaScript', 20, 65, 'Plateforme'),
('00000000-0000-0000-0000-00000000e003', 'GRILLE', 'Entretien technique back-end', 'Java,Architecture,Communication', 45, 70, 'Plateforme');

insert into eval_modele_element (id, modele_id, ordre, competence, niveau, nombre) values
(gen_random_uuid(), '00000000-0000-0000-0000-00000000e001', 1, 'Java', null, 4),
(gen_random_uuid(), '00000000-0000-0000-0000-00000000e001', 2, 'Spring Boot', null, 3),
(gen_random_uuid(), '00000000-0000-0000-0000-00000000e001', 3, 'SQL', null, 2),
(gen_random_uuid(), '00000000-0000-0000-0000-00000000e002', 1, 'React', null, 3),
(gen_random_uuid(), '00000000-0000-0000-0000-00000000e002', 2, 'JavaScript', null, 3);

insert into eval_modele_element (id, modele_id, ordre, libelle, guides, poids) values
(gen_random_uuid(), '00000000-0000-0000-0000-00000000e003', 1, 'Java et conception objet',
 E'Expliquez la différence entre composition et héritage, avec un exemple vécu.\nComment testez-vous une classe qui dépend d''une base de données ?', 2),
(gen_random_uuid(), '00000000-0000-0000-0000-00000000e003', 2, 'Architecture microservices',
 E'Comment gérez-vous une transaction qui touche deux services ?\nQuand préférez-vous Kafka à un appel REST ?', 2),
(gen_random_uuid(), '00000000-0000-0000-0000-00000000e003', 3, 'Communication',
 'Racontez une situation de désaccord technique avec un collègue.', 1);
