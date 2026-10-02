module.exports = [
  {
    "id": "0f60cbcb-b5ea-45df-988e-8de453b00597",
    "title": "Qu'est-ce qu'une base de données relationnelle",
    "content": "Une base de données relationnelle organise les informations en tables composées de lignes et de colonnes. Ce modèle repose sur la théorie des ensembles et la logique des prédicats, formalisée par Edgar F. Codd dans les années 1970. Chaque table représente une entité du monde réel, comme un client, un produit ou une commande, et chaque colonne définit un attribut précis de cette entité. Les clés primaires identifient de manière unique chaque enregistrement, tandis que les clés étrangères établissent les liens entre les différentes tables. Cette structure garantit l'intégrité des données et facilite leur manipulation. La compréhension de ces fondamentaux est indispensable avant d'aborder toute requête ou conception de schéma.",
    "lesson_type": "text"
  },
  {
    "id": "886ba806-ce6b-425d-b7c1-e0dbb58f1865",
    "title": "SGBDR et le modèle en tables",
    "content": "Les systèmes de gestion de bases de données relationnelles, communément appelés SGBDR, incarnent l'application concrète du modèle relationnel. PostgreSQL, MySQL, Oracle et SQL Server figurent parmi les solutions les plus répandues dans l'industrie. Chaque SGBDR propose un moteur d'exécution qui interprète les requêtes SQL, gère les transactions et assure la cohérence des données selon les principes ACID. Le langage SQL constitue l'interface standard pour communiquer avec ces systèmes, permettant de définir les structures de données, d'insérer, de modifier et d'interroger les informations. Un bon choix de SGBDR dépend de facteurs tels que le volume attendu, les exigences de performance et le budget disponible.",
    "lesson_type": "text"
  },
  {
    "id": "1b294d2e-c0e4-4325-b625-1bbc41f2c52c",
    "title": "Appliquer le modèle relationnel à un cas concret",
    "content": "Prenons l'exemple d'une librairie en ligne qui doit gérer ses livres, ses auteurs et ses ventes. La première étape consiste à identifier les entités principales et leurs attributs, puis à établir les relations entre elles. Un livre peut avoir un ou plusieurs auteurs, une vente concerne un ou plusieurs livres, et chaque client possède un historique d'achats. Il faut ensuite traduire ce diagramme en tables SQL en choisissant judicieusement les clés primaires et étrangères. La normalisation permet d'éviter les redondances tout en préservant la performance des requêtes. L'exercice consiste à créer le schéma complet, à insérer des données de test et à vérifier que les contraintes d'intégrité fonctionnent correctement.",
    "lesson_type": "text"
  },
  {
    "id": "8a3ff787-36c2-4786-82ca-82c70a93ed35",
    "title": "Concevoir un schéma pour un commerce électronique",
    "content": "Un projet de commerce électronique impose des contraintes spécifiques sur la conception du schéma de base de données. Les produits peuvent appartenir à des catégories hiérarchiques, les commandes regroupent plusieurs articles avec des quantités variables, et les utilisateurs possèdent à la fois un profil et des adresses de livraison multiples. La modélisation doit anticiper les évolutions futures, comme l'ajout de variantes de produits ou le système de promotions. Un diagramme entité-relation bien conçu facilite les développements ultérieurs et réduit les risques d'erreurs structurelles. Il est recommandé de valider le schéma avec les parties prenantes avant toute implémentation.",
    "lesson_type": "text"
  },
  {
    "id": "e1e5c937-68b4-49ee-8f4c-4609a4242609",
    "title": "Évaluer la qualité d'une modélisation existante",
    "content": "L'évaluation d'un schéma de base de données existant requiert une approche méthodique qui examine à la fois la structure, les performances et l'évolutivité. Il convient de vérifier le respect des formes normales, de repérer les redondances inutiles et d'identifier les clés manquantes ou mal définies. Les requêtes fréquentes doivent pouvoir s'exécuter sans scanner entièrement des tables volumineuses, ce qui implique une analyse des plans d'exécution. Un schéma bien conçu résiste aux modifications structurelles mineures sans nécessiter de refactorisation massive. Les erreurs courantes incluent l'absence de clés étrangères, les jointures circulaires et le mélange de préoccupations dans une même table. La revue de code du schéma devrait faire partie intégrante du processus de développement.",
    "lesson_type": "text"
  },
  {
    "id": "be1e033f-fd75-4af4-85bb-1ece71936ccc",
    "title": "Atelier de conception d'un schéma complet",
    "content": "Cet atelier propose de concevoir de zéro la base de données d'un système de réservation d'hôtels. Les entités à modéliser incluent les hôtels, les chambres, les réservations, les clients et les paiements. La première étape consiste à produire un diagramme entité-relation sur papier, en identifiant les cardinalités et les attributs de chaque relation. Ensuite, on traduit ce diagramme en instructions SQL de création de tables avec les contraintes appropriées. Des données de test permettent de vérifier que les requêtes courantes, comme la recherche de disponibilité ou l'historique des réservations, fonctionnent correctement. Enfin, on discute des compromis entre normalisation et performance pour les cas d'usage prioritaires.",
    "lesson_type": "text"
  },
  {
    "id": "5d3e37a6-e818-41c3-b697-45a34cdbcb90",
    "title": "Syntaxe de base de la commande SELECT",
    "content": "La commande SELECT constitue l'outil fondamental pour extraire des données d'une base relationnelle. Sa syntaxe de base permet de spécifier les colonnes à récupérer, la table source et éventuellement des conditions de filtrage. La clause FROM indique la table ou les tables impliquées, tandis que WHERE restitue uniquement les lignes satisfaisant un critère donné. L'ordre des clauses est imposé par le standard SQL et doit être respecté pour que la requête soit syntaxiquement correcte. Des opérateurs comme BETWEEN, IN et LIKE élargissent les possibilités de filtrage sans complexifier excessivement la logique. La pratique régulière de ces instructions développe l'intuition nécessaire pour construire des requêtes de plus en plus élaborées.",
    "lesson_type": "text"
  },
  {
    "id": "3cd98d4b-938e-4cce-a018-6bef625a1f54",
    "title": "Filtrer les données avec WHERE et ORDER BY",
    "content": "La clause WHERE applique des conditions de sélection sur les lignes retournées par une requête. Les opérateurs de comparaison tels que égal, différent, supérieur ou inférieur permettent de définir des critères précis, tandis que AND, OR et NOT combinent plusieurs conditions. La fonction BETWEEN sélectionne une plage de valeurs, IN vérifie l'appartenance à une liste, et LIKE recherche des motifs de chaînes de caractères. La clause ORDER BY trie les résultats selon une ou plusieurs colonnes, en ordre ascendant ou descendant par défaut. La combinaison de ces deux clauses produit des extractions ciblées et ordonnées, essentielles pour les rapports et les interfaces utilisateur. Une erreur fréquente consiste à omettre les parenthèses lors de la combinaison de conditions complexes avec AND et OR.",
    "lesson_type": "text"
  },
  {
    "id": "3db0a33a-19b9-479c-acf0-3927aca73ed6",
    "title": "Effectuer des jointures entre tables",
    "content": "Les jointures permettent de combiner les données de plusieurs tables en une seule requête, sur la base d'une condition de correspondance entre colonnes. La jointure interne ne conserve que les lignes ayant une correspondance dans les deux tables, tandis que les jointures externes conservent également les lignes sans correspondance. La jointure gauche est la plus couramment utilisée pour rattacher des informations complémentaires sans perdre les enregistrements principaux. La syntaxe ANSI avec INNER JOIN, LEFT JOIN et ON remplace avantageusement l'ancienne méthode par virgule dans la clause FROM. Les jointures multiples ou chaînées permettent de relier plus de deux tables, mais exigent une attention particulière aux performances et à la lisibilité des requêtes. Le choix du type de jointure dépend directement du résultat attendu et des données disponibles.",
    "lesson_type": "text"
  },
  {
    "id": "881ce664-0f1a-4c40-a254-37cd6dc40ef8",
    "title": "Agrégations et regroupements avec GROUP BY",
    "content": "Les fonctions d'agrégation SQL, telles que COUNT, SUM, AVG, MIN et MAX, résument des ensembles de données en une seule valeur. La clause GROUP BY divise les lignes en groupes selon les valeurs d'une colonne, permettant ainsi d'appliquer une agrégation par groupe. Par exemple, pour connaître le nombre de ventes par produit, on regroupe les ventes par identifiant produit puis on compte les enregistrements dans chaque groupe. La clause HAVING filtre les groupes résultants selon une condition portant sur la valeur agrégée, contrairement à WHERE qui agit sur les lignes individuelles. L'ordre d'exécution impose que GROUP BY soit placé après WHERE et avant HAVING dans la syntaxe. Cette mécanique est essentielle pour produire des statistiques, des rapports et des tableaux de bord à partir de données brutes.",
    "lesson_type": "text"
  },
  {
    "id": "3aa22200-a551-4a0f-9403-86ee17f53aec",
    "title": "Sous-requêtes et expressions communes de table",
    "content": "Les sous-requêtes imbriquent une requête dans le corps d'une autre, fournissant des résultats intermédiaires utilisés pour filtrer ou calculer. Une sous-requête dans WHERE vérifie l'existence ou la valeur d'un élément dans une autre table, tandis qu'une sous-requête dans FROM agit comme une table virtuelle aliasée. Les expressions communes de table, ou CTE avec WITH, offrent une alternative plus lisible en définissant un résultat temporaire référençable plusieurs fois dans la requête. Les CTE récursives permettent de parcourir des structures hiérarchiques comme des arbres de catégories ou des organigrammes. Le choix entre sous-requête et CTE dépend de la complexité logique, de la lisibilité voulue et des capacités d'optimisation du moteur SQL utilisé. La maîtrise de ces techniques ouvre la voie à des requêtes expressives et maintenables.",
    "lesson_type": "text"
  },
  {
    "id": "2f63bd6d-7b5a-4cd1-90a3-5e2ceeb1921a",
    "title": "Construire des requêtes SQL robustes et maintenables",
    "content": "Écrire du SQL maintenable au-delà du prototypage rapide exige des habitudes structurées. Les alias explicites rendent les requêtes lisibles même lorsqu'elles impliquent de nombreuses jointures. L'indentation cohérente et la séparation des clauses sur des lignes distinctes facilitent la compréhension du flux logique. Les commentaires internes documentent les choix de performance ou les hypothèses métier non évidentes. L'utilisation de vues et de fonctions stockées encapsule la complexité pour les requêteurs ultérieurs. Les tests unitaires sur des ensembles de données miniatures valident les résultats attendus avant le déploiement. Enfin, la désignation de standards d'écriture SQL au sein de l'équipe assure une uniformité qui réduit les bugs et accélère l'intégration des nouveaux développeurs.",
    "lesson_type": "text"
  },
  {
    "id": "3c34c768-b510-4758-ac4a-c4e758b3c2db",
    "title": "ACID et les garanties transactionnelles",
    "content": "Les propriétés ACID définissent les fondements de la fiabilité dans les systèmes de gestion de bases de données. L'atomicité garantit qu'une transaction est soit entièrement appliquée, soit annulée en cas d'erreur. La cohérence assure que chaque transaction passe la base d'un état valide à un autre état valide, en respectant toutes les contraintes définies. L'isolation garantit que les transactions concurrentes n'interfèrent pas entre elles, même si elles manipulent les mêmes données. La durabilité stipule qu'une transaction validée persiste de manière permanente, même en cas de panne matérielle. Ces quatre propriétés constituent le socle sur lequel repose la confiance dans les systèmes transactionnels critiques.",
    "lesson_type": "text"
  },
  {
    "id": "42ffe496-4555-46ad-a967-f388d8182c47",
    "title": "Démarrer et valider une transaction SQL",
    "content": "L'instruction BEGIN marque le démarrage d'une nouvelle transaction, isolant les opérations suivantes du reste des opérations concurrentes. Les commandes INSERT, UPDATE et DELETE exécutées dans ce contexte modifient les données de manière provisoire, visible uniquement au sein de la transaction courante. L'instruction COMMIT valide toutes les modifications et les rend définitives, tandis que ROLLBACK annule l'ensemble des opérations depuis le BEGIN. Les SGBDR modernes proposent également le mode autocommit, où chaque instruction est implicitement une transaction. La gestion explicite des transactions est indispensable lorsqu'une opération logique regroupe plusieurs instructions interdépendantes. Une erreur non détectée dans ce processus peut provoquer des incohérences graves, d'où l'importance des blocs d'exception et des mécanismes de sauvegarde automatique.",
    "lesson_type": "text"
  },
  {
    "id": "419124dd-0fe6-4094-b517-a08b296f5900",
    "title": "Gestion des erreurs et annulation de transactions",
    "content": "Lorsqu'une erreur survient au cours d'une transaction, le mécanisme de rollback garantit le retour à l'état antérieur sans perte de données. Les blocs d'exception en SQL permettent de capturer les erreurs et d'exécuter un traitement adapté, comme l'annulation partielle ou le journal des événements. La sévérité de l'erreur détermine si la transaction peut être reprise ou doit être abandonnée intégralement. Les erreurs de contrainte d'intégrité, de deadlock ou de violation de règle déclenchent des codes spécifiques que le développeur doit interpréter. Une bonne gestion des erreurs transactionnelles inclut la journalisation détaillée et l'alerte de l'administrateur en cas d'anomalie critique. La résilience d'une application dépend directement de la rigueur avec laquelle ces scénarios d'échec sont traités.",
    "lesson_type": "text"
  },
  {
    "id": "177f9fb8-2c32-40a2-886d-71a11c9a8817",
    "title": "Niveaux d'isolation et leurs compromis",
    "content": "Les niveaux d'isolation définissent le degré de visibilité des modifications non encore commit entre transactions concurrentes. Le niveau lecture non confirmée autorise la lecture de données modifiées mais non validées, offrant les meilleures performances mais un risque élevé d'incohérence. Le niveau lecture confirmée garantit que chaque lecture ne voit que les données validées, ce qui constitue le compromis le plus courant. Le niveau repeatable élimine les lectures fantômes en verrouillant les plages de données consultées. Enfin, le niveau sérialisable reproduit l'effet d'une exécution séquentielle, au prix d'une dégradation significative des performances. Le choix du niveau d'isolation doit être adapté à la nature des transactions et aux tolérances aux erreurs métier.",
    "lesson_type": "text"
  },
  {
    "id": "f31e03b9-0a0a-4615-9700-3f61298cff06",
    "title": "Détection et résolution des deadlocks",
    "content": "Un deadlock se produit lorsque deux ou plusieurs transactions s'attendent mutuellement la libération de ressources verrouillées, créant un interblocage permanent. Les SGBDR disposent de mécanismes de détection qui identifient les cycles de dépendance et annulent automatiquement l'une des transactions impliquées. La stratégie de sacrifice dépend généralement du coût estimé de chaque transaction ou de son temps d'exécution écoulé. Pour prévenir les deadlocks, il est recommandé d'accéder aux ressources dans un ordre cohérent et de limiter la durée des transactions. L'analyse des journaux de deadlocks permet d'identifier les schémas de concurrence problématiques et de réorganiser le code en conséquence. Les techniques d'optimisme, comme la validation à la fin de la transaction, constituent une alternative aux verrouillages pessimistes.",
    "lesson_type": "text"
  },
  {
    "id": "14315af9-59a8-400f-a4ed-3cc20b0d1e6a",
    "title": "Concevoir un workflow transactionnel sûr",
    "content": "Un workflow transactionnel sûr anticipe les scénarios d'échec et garantit la cohérence des données à chaque étape du processus métier. La première étape consiste à identifier toutes les opérations qui doivent être atomiques, c'est-à-dire qui doivent réussir ou échouer ensemble. Ensuite, on définit les points de sauvegarde intermédiaires qui permettent une reprise partielle en cas d'erreur. La gestion des ressources partagées doit éviter les verrouillages excessifs tout en assurant l'isolation nécessaire. Les tests de charge simulent des scénarios de concurrence réels pour valider le comportement en conditions limites. La documentation du workflow inclut les diagrammes d'état, les codes d'erreur et les procédures de récupération. Cette préparation réduit considérablement les risques de perte de données en production.",
    "lesson_type": "text"
  },
  {
    "id": "35a985a5-1b02-41b7-af9c-287085849863",
    "title": "Principe de fonctionnement d'un index",
    "content": "Un index est une structure de données secondaire qui accélère la recherche de lignes dans une table en fournissant un chemin rapide vers les enregistrements correspondants. L'analogie la plus courante est celle de l'index d'un livre, qui indique la page où un sujet est traité sans nécessiter la lecture de l'ouvrage entier. En base de données, l'index stocke une copie de la colonne indexée avec une référence vers la ligne physique, permettant au moteur d'éviter le scan complet de la table. Le type d'index détermine la structure interne, le B-tree étant le plus utilisé pour les recherches par plage. L'ajout d'un index améliore les performances de lecture mais ralentit légèrement les opérations d'écriture, car l'index doit être mis à jour à chaque modification. Un choix d'index pertinent équilibre ces deux contraintes en fonction des besoins réels de l'application.",
    "lesson_type": "text"
  },
  {
    "id": "a62f9d34-ea01-4d20-821f-6025b4b89051",
    "title": "Stratégies de sélection des colonnes à indexer",
    "content": "La sélection des colonnes à indexer repose sur l'analyse des requêtes les plus fréquentes et des patterns d'accès aux données. Les colonnes utilisées dans les clauses WHERE, JOIN et ORDER BY sont les premières candidates, car elles déterminent directement les opérations de filtrage et de tri. Les colonnes à cardinalité élevée, c'est-à-dire celles contenant de nombreuses valeurs distinctes, produisent des index plus discriminants. À l'inverse, une colonne avec seulement quelques valeurs distinctes ne mérite pas d'être indexée isolément. Les index composites couvrent plusieurs colonnes et sont efficaces lorsque les requêtes filtrent simultanément sur ces colonnes dans le bon ordre. L'observation des plans d'exécution révèle les index réellement utilisés et permet d'affiner la stratégie d'indexation.",
    "lesson_type": "text"
  },
  {
    "id": "ad10b1b7-4d26-49ab-bf86-a5d5a5cfd2cc",
    "title": "Interpréter un plan d'exécution EXPLAIN",
    "content": "L'instruction EXPLAIN analyse la manière dont le moteur SQL exécute une requête, révélant les opérations internes et leur coût estimé. Le plan d'exécution affiche l'ordre des opérations, les types de jointures utilisés, l'utilisation des index et le nombre de lignes estimées à chaque étape. Un scan complet de table indique l'absence d'index pertinent, tandis qu'un index scan confirme l'utilisation efficace d'une structure d'indexation. Les coûts cumulatifs permettent d'identifier les goulots d'étranglement et d'orienter les optimisations. La variante EXPLAIN ANALYZE exécute réellement la requête et compare les estimations aux résultats obtenus, offrant un diagnostic plus précis. La lecture régulière des plans d'exécution développe l'oeil critique nécessaire pour écrire du SQL performant.",
    "lesson_type": "text"
  },
  {
    "id": "ce945bc0-b5eb-4f5d-8ec8-f28974099f5b",
    "title": "Comparer les types d'index et leurs cas d'usage",
    "content": "Le B-tree est l'index par défaut dans la majorité des SGBDR, adapté aux recherches par plage, aux comparaisons d'égalité et aux tris. L'index hash excèle pour les recherches d'égalité exacte mais ne supporte pas les opérateurs de comparaison de plage. L'index GIN est conçu pour les colonnes contenant des données composites comme les tableaux ou le JSON, permettant des recherches de contenu. L'index GiST est utile pour les données géospatiales et les recherches par similarité textuelle. L'index partionné divise un grand index en sous-index plus petits, accélérant les recherches sur les partitions les plus pertinentes. Le choix du type d'index dépend de la nature des données, du type de requêtes et des contraintes de stockage disponibles.",
    "lesson_type": "text"
  },
  {
    "id": "967c4ef8-85e3-4c81-8515-a0779216d152",
    "title": "Identifier et supprimer les index obsolètes",
    "content": "Les index inutiles consomment de l'espace disque et ralentissent les opérations d'insertion, de mise à jour et de suppression. La surveillance des statistiques d'utilisation des index révèle ceux qui ne sont jamais sollicités par le moteur de requête. Certains SGBDR fournissent des vues système qui indiquent le nombre de scans par index. Avant de supprimer un index, il convient de vérifier qu'il ne sert pas à maintenir une contrainte d'unicité ou une clé étrangère. La suppression se fait par DROP INDEX selon le SGBDR, et doit être suivie d'une vérification des performances. Une politique d'indexation proactive inclut des revues périodiques et des règles de documentation pour chaque index créé.",
    "lesson_type": "text"
  },
  {
    "id": "6d3219a6-1575-4cbd-9116-c29138414269",
    "title": "Mesurer l'impact d'une optimisation d'index",
    "content": "La mesure rigoureuse de l'impact d'une optimisation d'index requiert de comparer les performances avant et après la modification sur un ensemble de requêtes représentatif. Les métriques clés incluent le temps d'exécution moyen, le nombre de lignes scannées et le coût total affiché par EXPLAIN ANALYZE. Il est essentiel de tester sur un volume de données proche de la production, car les index se comportent différemment selon la taille de la table. Les tests de charge simulent des scénarios concurrents pour évaluer l'impact sur le débit global du système. L'enregistrement historique des mesures permet de détecter les dégradations progressives liées à l'évolution des données. Une optimisation réussie réduit le temps de réponse sans compromettre la fiabilité ni la cohérence des résultats.",
    "lesson_type": "text"
  },
  {
    "id": "83f06459-ddcc-4b4b-a8fb-a7643e8ab4c7",
    "title": "Le NoSQL : définition et motivations",
    "content": "NoSQL désigne un ensemble de technologies de stockage de données qui s'écartent du modèle relationnel classique pour répondre à des besoins spécifiques de volume, de vitesse ou de flexibilité. Le terme couvre les bases clé-valeur, les bases documentaires, les bases colonnaires et les bases graphiques, chacune optimisée pour un type d'opération particulier. Le NoSQL se développe avec l'essor du big data, des applications en temps réel et des architectures distribuées qui nécessitent une scalabilité horizontale. Contrairement aux bases relationnelles qui imposent un schéma rigide, la plupart des systèmes NoSQL autorisent un schéma dynamique adapté à des données hétérogènes. Le compromis fondamental réside dans le théorème CAP, qui impose de choisir entre cohérence, disponibilité et tolérance au partitionnement. La compréhension de ces enjeux est indispensable pour orienter le choix technologique vers la solution la plus adaptée.",
    "lesson_type": "text"
  },
  {
    "id": "adcbb076-a665-4f9f-b784-a19ca1a792c5",
    "title": "Les quatre familles de bases NoSQL",
    "content": "Les bases clé-valeur, incarnées par Redis ou DynamoDB, associent une clé unique à une valeur opaque, offrant des performances extrêmement élevées pour des opérations simples. Les bases documentaires comme MongoDB ou CouchDB stockent des documents JSON flexibles dont la structure peut varier d'un enregistrement à l'autre. Les bases colonnaires, représentées par Cassandra ou HBase, organisent les données en colonnes regroupées en familles, optimisant les lectures de grandes masses de données. Les bases graphes, telles que Neo4j ou Amazon Neptune, modélisent directement les relations entre entités pour des requêtes de parcours de graphe efficaces. Chaque famille présente des compromis distincts en termes de cohérence, de disponibilité et de performances. Le choix entre ces modèles dépend du type de données, du pattern d'accès et des contraintes de l'application cible.",
    "lesson_type": "text"
  },
  {
    "id": "820876cd-6f5d-4a62-9f4b-fca7d9df0a63",
    "title": "Tester un scénario avec une base documentaire",
    "content": "Imaginons un système de gestion de contenu musical où chaque morceau possède des métadonnées variables selon le genre, l'album et les crédits. Une base documentaire MongoDB se prête parfaitement à ce cas d'usage, car chaque document peut contenir des champs spécifiques sans affecter les autres enregistrements. La première étape consiste à définir la structure de base des documents, puis à insérer un échantillon représentatif de différents genres musicaux. Les requêtes de recherche explorent les capacités de filtrage sur des propriétés imbriquées et les tableaux. Les opérations d'agrégation regroupent les morceaux par genre ou par artiste pour produire des statistiques. La flexibilité du schéma permet d'ajouter de nouveaux attributs, comme les paroles ou les partitions, sans migration de données. Cet exercice concret illustre les avantages et les limites du modèle documentaire face à des données réelles.",
    "lesson_type": "text"
  },
  {
    "id": "06ff80e7-a3b7-44bf-8281-b0a7b09aee2e",
    "title": "Cas concret : tracker des événements utilisateur",
    "content": "Le suivi des comportements d'utilisateurs sur un site génère des volumes considérables d'événements aux structures hétérogènes. Un clic, une page visitée, un achat ou une interaction sociale produit des données qui ne partagent pas toutes le même schéma. Les bases NoSQL excellent dans ce scénario car elles absorbent naturellement cette hétérogénéité sans nécessiter de schéma préalable. La scalabilité horizontale permet de répartir la charge d'écriture sur de nombreux nœuds, garantissant des temps de réponse stables même en période de forte affluence. Le choix du modèle de stockage dépend de l'analyse posteriori souhaitée : les données de parcours sont idéales pour un modèle graphe, tandis que les compteurs d'agrégation profitent d'un modèle clé-valeur. La conception du pipeline d'ingestion détermine la qualité des données disponibles pour l'analyse ultérieure.",
    "lesson_type": "text"
  },
  {
    "id": "0efb0f48-3504-4174-818e-50bcb4d21f6f",
    "title": "Comparaison SQL et NoSQL pour un projet donné",
    "content": "Lors du choix technologique pour un projet, il faut évaluer la nature des données, les patterns d'accès et les contraintes de performance. Un système de gestion bancaire exige une cohérence forte et des transactions ACID, ce qui favorise naturellement les bases relationnelles. À l'inverse, une application de recommandation sociale implique des relations complexes entre entités et des volumes massifs, ce qui oriente vers une base graphique ou documentaire. Le coût de la migration entre technologies est un facteur déterminant : il est plus sûr de commencer par une base relationnelle et d'introduire le NoSQL uniquement quand les besoins l'exigent. L'interopérabilité entre systèmes est de plus en plus facilitée par des connecteurs standardisés et des architectures hybrides. La décision finale doit reposer sur des prototypes mesurés plutôt que sur des tendances technologiques.",
    "lesson_type": "text"
  },
  {
    "id": "751b52d7-011b-41e4-9a88-904fe6e0a0e3",
    "title": "Mini-projet : architecture données multi-modèle",
    "content": "Ce mini-projet propose de concevoir une architecture de données combinant plusieurs modèles pour une application de gestion d'événements. Le cahier des charges inclut le stockage des événements, des participants, des billets et des retours utilisateurs. Les événements et les billets, à structure variable, sont stockés dans une base documentaire, tandis que les relations entre participants et événements sont modélisées dans une base graphique. Les compteurs de participation et les sessions actives exploitent une base clé-valeur pour des performances optimales. La cohérence entre les systèmes est assurée par un pipeline d'événements qui synchronise les données en temps quasi réel. L'exercice se conclut par la rédaction d'un comparatif des performances de chaque modèle sur les opérations prioritaires du projet.",
    "lesson_type": "text"
  },
  {
    "id": "40aa2fc6-6a08-4794-8ef1-7450cca347d7",
    "title": "Structure d'un document BSON",
    "content": "MongoDB utilise le format BSON, une représentation binaire du JSON, pour stocker les documents dans ses collections. BSON étend le JSON natif avec des types supplémentaires comme Date, ObjectId, Decimal128 et Binary, offrant une précision et une efficacité supérieures. Chaque document possède un identifiant unique automatiquement généré, l'ObjectId, qui garantit l'unicité au sein de la collection. Les documents peuvent être imbriqués, contenant des objets ou des tableaux qui modélisent des structures hiérarchiques complexes. La taille maximale d'un document est de 16 Mo, une contrainte qui impose de réfléchir à la granularité des données stockées. La connaissance de BSON est essentielle pour exploiter pleinement les fonctionnalités de MongoDB et éviter les erreurs de type courantes.",
    "lesson_type": "text"
  },
  {
    "id": "eaee7634-17de-4204-b49e-31ba20dfac67",
    "title": "Insérer et interroger des documents",
    "content": "L'opération insertOne ajoute un document unique à une collection, tandis que insertMany insère un tableau de documents en une seule requête atomique. La création d'une collection est implicite lors de la première insertion, MongoDB gérant automatiquement l'allocation de l'espace disque. La recherche find retourne un curseur parcourant tous les documents correspondant au filtre spécifié, et findOne n'en retourne qu'un seul. Les opérateurs de filtre comme eq, gt, in et regex permettent de cibler des sous-ensembles précis de documents. La projection définit quelles propriétés sont retournées dans le résultat, optimisant le transfert de données. Ces opérations de base constituent le socle de toute interaction avec MongoDB et doivent être maîtrisées avant d'aborder les fonctionnalités avancées.",
    "lesson_type": "text"
  },
  {
    "id": "f03ef58c-0476-4c92-9d76-3f2c5ee66dec",
    "title": "Modifier des documents avec updateOne et updateMany",
    "content": "L'opération updateOne modifie le premier document correspondant au filtre, tandis que updateMany affecte tous les documents qui satisfont la condition. Les opérateurs de mise à jour comme set, unset, inc et push ciblent des propriétés spécifiques sans remplacer l'intégralité du document. L'option upsert crée automatiquement un document si aucun ne correspond au filtre, éliminant la nécessité d'une vérification préalable. Les mises à jour imbriquées utilisent la notation pointée pour modifier des propriétés situées dans des objets imbriqués ou des tableaux. L'opération findOneAndUpdate retourne le document dans son état avant ou après la modification selon l'option returnDocument. La sécurité des mises à jour repose sur des filtres précis pour éviter les modifications non intentionnelles.",
    "lesson_type": "text"
  },
  {
    "id": "d8b09476-5802-4733-9e34-d61b447382b7",
    "title": "Interroger MongoDB avec des filtres avancés",
    "content": "MongoDB offre un système de requêtage riche qui dépasse les simples comparaisons d'égalité. Les opérateurs logiques and, or et not combinent plusieurs conditions pour affiner la sélection des documents. Les opérateurs de comparaison comme gte, lte, ne et in permettent de définir des plages et des ensembles de valeurs. Les opérateurs d'éléments elemMatch et size filtrent les contenus de tableaux imbriqués selon des critères précis. Les expressions régulières offrent des capacités de recherche textuelle puissantes pour des critères de filtrage complexes. La combinaison judicieuse de ces opérateurs produit des requêtes expressives sans recourir à des frameworks d'agrégation pour les cas simples. La performance de ces requêtes dépend directement de la présence d'index pertinents sur les propriétés interrogées.",
    "lesson_type": "text"
  },
  {
    "id": "8b5d9f05-77cf-4512-9f0e-13c6536aa9c4",
    "title": "Pipeline d'agrégation dans MongoDB",
    "content": "Le framework d'agrégation de MongoDB transforme les données à travers une série d'étapes séquentielles, comparable à un tuyau de traitement. L'étape match filtre les documents en entrée, réduisant le volume de données traité par les étapes suivantes. L'étape group regroupe les documents par une clé définie et applique des opérateurs d'agrégation comme sum, avg et push. Les étapes project, addFields et unwind transforment la structure des documents pour préparer la sortie. L'étape lookup réalise des jointures avec d'autres collections, étendant les données disponibles sans duplication. L'optimisation des pipelines consiste à placer les filtres en amont et à minimiser le nombre d'étapes de transformation. Les pipelines d'agrégation constituent l'outil le plus puissant de MongoDB pour l'analyse de données complexes.",
    "lesson_type": "text"
  },
  {
    "id": "3803b815-8421-44cd-82fd-974aa60e9212",
    "title": "Choix entre embedding et référencement",
    "content": "En MongoDB, la décision entre embedding et référencement détermine la structure des documents et les performances des requêtes. L'embedding consiste à imbriquer les données liées directement dans le document parent, éliminant le besoin de jointures. Cette approche est idéale pour les données accédées ensemble et présentant un ratio un-à-un ou un-à-peu. Le référencement stocke un identifiant vers un document dans une autre collection, utile pour les données partagées ou accédées indépendamment. Les sous-documents imbriqués ne doivent pas dépasser la taille maximale du document et peuvent conduire à des mises à jour complexes. Le schéma de référence nécessite des requêtes supplémentaires mais facilite la mise à jour et la cohérence des données. Le choix dépend du pattern d'accès dominant, du volume de données et de la fréquence des mises à jour.",
    "lesson_type": "text"
  },
  {
    "id": "c6306f6a-b63e-4016-ac3b-58b4a5d13239",
    "title": "Concepts de la persistance polyglotte",
    "content": "La persistance polyglotte consiste à utiliser plusieurs technologies de stockage au sein d'une même application, chacune adaptée à un besoin spécifique. Ce paradigme reconnaît qu'aucun système de gestion de bases de données ne peut optimiser simultanément tous les types d'opérations et de données. Le principe repose sur l'idée qu'il faut choisir le bon outil pour chaque problème, au risque de complexifier l'architecture globale. Les limites de responsabilité délimitent chaque zone de stockage avec ses propres contraintes de cohérence et de disponibilité. L'intégration entre les systèmes est assurée par des événements asynchrones ou des synchronisations périodiques. La maîtrise de ce paradigme exige une compréhension approfondie des compromis inhérents à chaque technologie de stockage.",
    "lesson_type": "text"
  },
  {
    "id": "af82ea5c-fd08-4688-950a-5503ab015ef6",
    "title": "Orchestration de plusieurs moteurs de stockage",
    "content": "L'orchestration de plusieurs moteurs de stockage nécessite une couche d'abstraction qui unifie les interfaces d'accès aux données. Des frameworks comme Spring Data ou les bibliothèques d'accès unifié permettent d'interagir avec différentes bases via des interfaces communes. La synchronisation entre les systèmes peut être synchrone, pour les opérations critiques, ou asynchrone, pour les mises à jour à fort volume. Les événements de changement de données, ou CDC, capturent les modifications en temps réel et les propagent entre les systèmes. La cohérence eventuelle est le modèle le plus courant dans les architectures polyglottes, acceptant des délais de synchronisation mesurables. La surveillance centralisée des performances et de la cohérence est indispensable pour détecter les anomalies avant qu'elles n'affectent les utilisateurs.",
    "lesson_type": "text"
  },
  {
    "id": "a0567f31-0616-47d5-ad48-297dbe5fa5f1",
    "title": "Concevoir un pipeline ETL hybride",
    "content": "Un pipeline ETL hybride extrait les données de sources variées, les transforme pour les adapter aux formats cibles et les charge dans les systèmes de stockage appropriés. L'extraction provient de bases relationnelles, de bases NoSQL, d'APIs externes et de fichiers plats, chaque source nécessitant un connecteur spécifique. La phase de transformation applique des règles métier, nettoie les données et les restructure pour répondre aux schémas des bases cibles. Le chargement utilise les protocoles natifs de chaque système de stockage pour maximiser les performances et la fiabilité. La gestion des erreurs et la journalisation complète du pipeline permettent de tracer chaque enregistrement de sa source à sa destination. L'orchestration des étapes, avec des mécanismes de reprise sur échec, garantit la complétude du traitement même en cas d'incident.",
    "lesson_type": "text"
  },
  {
    "id": "00798f71-27ce-4a37-b68b-caebcccda6e5",
    "title": "Résoudre un problème de synchronisation multi-bases",
    "content": "Un e-commerce utilise simultanément PostgreSQL pour les commandes, Redis pour les sessions et Elasticsearch pour la recherche de produits. Lorsqu'une commande est validée, le stock doit être mis à jour dans PostgreSQL, l'indisponibilité reflétée dans Elasticsearch et la session utilisateur vidée dans Redis. La synchronisation directe entre ces systèmes crée des couples fortement couplés vulnérables aux défaillances. La solution consiste à introduire un bus d'événements qui distribue les notifications de changement à chaque souscripteur. Chaque système traite l'événement de manière indépendante, à son propre rythme, garantissant la résilience globale. La cohérence eventuelle est acceptée comme compromis, avec des mécanismes de résolution de conflits pour les cas rares de modifications concurrentes. Le monitoring du pipeline d'événements permet de détecter les retards ou les échecs de synchronisation.",
    "lesson_type": "text"
  },
  {
    "id": "11efea55-8987-4817-81ff-4b71a7c99bbf",
    "title": "Évaluer l'architecture de données d'un projet",
    "content": "L'évaluation d'une architecture de données hybride repose sur des critères mesurables de performance, de fiabilité et de maintenabilité. Les métriques de latence pour chaque opération critique révèlent si les compromis de cohérence sont acceptables pour les utilisateurs. Le coût de stockage et de calcul est analysé en tenant compte de l'évolutivité future et des variations de charge. La complexité opérationnelle, incluant la surveillance, les sauvegardes et les mises à jour, constitue un facteur de coût souvent sous-estimé. Les risques de perte de données sont évalués pour chaque système en fonction des mécanismes de réplication et de sauvegarde disponibles. La documentation de l'architecture, incluant les diagrammes de flux et les règles de cohérence, facilite l'intégration de nouveaux développeurs. Enfin, le plan de migration ou de décommissionnement est esquissé dès la phase de conception pour éviter les impasses technologiques.",
    "lesson_type": "text"
  },
  {
    "id": "b5dca3a0-2a79-49e5-bacc-153a507e6822",
    "title": "Atelier : prototyper une architecture polyglotte",
    "content": "Cet atelier guide la conception d'une architecture de données pour une application de suivi de santé connectée. Les capteurs génèrent des mesures continues qui sont stockées dans une base temporelle, tandis que les profils patients et les ordonnances résident dans une base relationnelle. Les interactions entre patients et médecins, sous forme de messages et de notifications, exploitent une base de documents flexible. Les données agrégées pour la recherche clinique transitent par un lac de données avant d'être analysées. La première phase consiste à identifier les besoins de cohérence et de disponibilité pour chaque type de données. La deuxième phase prototypage les connecteurs entre les systèmes et teste les scénarios de synchronisation. La dernière phase rédige les spécifications de l'architecture, incluant les plans de surveillance et les seuils d'alerte.",
    "lesson_type": "text"
  },
  {
    "id": "d9adb1c7-ce04-4132-b420-f37bd878aa97",
    "title": "Stratégie de sélection des technologies de stockage",
    "content": "La sélection des technologies de stockage pour un projet data commence par une analyse approfondie des besoins fonctionnels et non fonctionnels. Les besoins fonctionnels décrivent les types de données à stocker, les opérations à supporter et les contraintes métier à respecter. Les besoins non fonctionnels couvrent la performance, la disponibilité, la scalabilité et les contraintes budgétaires. La matrice de décision compare les technologies candidates sur des critères pondérés reflétant les priorités du projet. Les prototypes techniques valident les hypothèses de performance sur un volume de données représentatif. La communauté active autour d'une technologie influence directement la qualité du support, des bibliothèques et des mises à jour de sécurité. La décision finale doit être documentée et révisable, car les besoins et les technologies évoluent constamment.",
    "lesson_type": "text"
  },
  {
    "id": "986f5b6d-de4f-49d3-a04a-0baec829c88b",
    "title": "Mettre en place un entrepôt de données",
    "content": "Un entrepôt de données centralise les informations issues de sources multiples pour l'analyse décisionnelle et le reporting. L'architecture en étoile organise les données autour de tables de faits chiffrées et de tables de dimension descriptives. Le processus ETL extrait les données des systèmes opérationnels, les transforme pour les adapter au schéma cible et les charge dans l'entrepôt. Les dimensions temporelles permettent d'analyser l'évolution des métriques dans le temps, fonctionnalité essentielle pour les tableaux de bord. La granularité des données détermine le niveau de détail disponible pour l'analyse, avec un compromis entre précision et volume de stockage. La gestion des historiques préserve l'évolution des données de référence au fil du temps. L'entrepôt constitue la source unique de vérité pour toutes les activités d'analyse de l'organisation.",
    "lesson_type": "text"
  },
  {
    "id": "9d54a1ee-f061-4847-a640-7144993eaba1",
    "title": "Construire des tableaux de bord interactifs",
    "content": "Les tableaux de bord interactifs transforment les données brutes de l'entrepôt en visualisations compréhensibles et actionables pour les décideurs. Le choix des métriques affichées doit refléter les objectifs stratégiques de l'organisation et évoluer avec les priorités métier. Les outils comme Metabase, Grafana ou Power BI se connectent directement aux sources de données et proposent des composants de visualisation préconfigurés. Les filtres dynamiques permettent aux utilisateurs d'explorer les données selon différents axes sans requérir de compétences techniques. La conception d'un tableau de bord efficace commence par la définition du public cible et des questions auxquelles il doit répondre. Les performances d'affichage dépendent de la qualité du modèle de données sous-jacent et de la pertinence des requêtes qui alimentent chaque graphique.",
    "lesson_type": "text"
  },
  {
    "id": "f39475cc-7764-4fa7-9afd-1bc29c24fd2e",
    "title": "Concevoir le schéma d'un lac de données",
    "content": "Un lac de données stocke des informations brutes dans leur format natif, offrant une flexibilité maximale pour l'analyse et le machine learning. La conception du schéma du lac doit prévoir une organisation claire par zones, avec une zone brute pour les données entrantes, une zone transformée pour les données nettoyées et une zone de production pour les résultats validés. Le métalivré documente l'origine, le format et la qualité de chaque jeu de données, facilitant sa réutilisation. Le partitionnement par date ou par source optimise les performances de lecture en réduisant le volume de données à scanner. La gestion du cycle de vie inclut l'archivage des données anciennes et la suppression des doublons pour contrôler les coûts de stockage. La gouvernance du lac garantit que les données restent accessibles, traçables et conformes aux réglementations en vigueur.",
    "lesson_type": "text"
  },
  {
    "id": "15e8379c-4a65-43cb-88d0-65d02ab290f7",
    "title": "Automatiser les pipelines de données",
    "content": "L'automatisation des pipelines de données élimine les interventions manuelles et garantit la fiabilité du traitement à chaque exécution. Des outils comme Apache Airflow, Dagster ou Prefect orchestrent les dépendances entre les tâches et gèrent les replays en cas d'échec. La définition des pipelines en code, souvent en YAML ou en Python, permet de versionner, tester et reviewer les modifications comme n'importe quel autre artefact logiciel. Les notifications automatiques alertent les équipes en cas de défaillance ou de retard par rapport au planning attendu. La surveillance des métriques de qualité, comme le volume de données traitées ou le taux d'erreurs, détecte les anomalies avant qu'elles n'affectent les consommateurs de données. La documentation vivante du pipeline, régénérée automatiquement à chaque modification, assure que les connaissances restent accessibles et à jour.",
    "lesson_type": "text"
  },
  {
    "id": "572ce397-3a06-48c0-b235-1797d961fab9",
    "title": "Intégrer et déployer une architecture data complète",
    "content": "L'intégration et le déploiement d'une architecture data complète nécessitent une planification rigoureuse des dépendances entre les composants. Chaque service de stockage doit être provisionné avec les ressources adéquates et configuré pour tolérer les défaillances matérielles. Les tests d'intégration vérifient que les flux de données circulent correctement entre les systèmes sans perte ni duplication. Le déploiement progressif, par lots ou par environnement, permet de détecter les problèmes avant qu'ils n'affectent l'ensemble de la plateforme. La surveillance post-déploiement combine les métriques de performance, les alertes de cohérence et les journaux d'erreurs pour assurer une visibilité complète. La rétroaction des utilisateurs et des analystes alimente un cycle d'amélioration continue qui affine l'architecture au fil du temps. Documenter les choix techniques et les raisons de leurs compromis facilite la maintenance à long terme.",
    "lesson_type": "text"
  }
];
