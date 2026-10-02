const { Client } = require('pg');
const c = new Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.wquicdlbtbcsivyqdltx', password: 'kaberayuub7', ssl: { rejectUnauthorized: false }
});

async function run() {
  await c.connect();

  const updates = [
    // Applications iOS avec Swift
    { id: '75839931-7b9a-4fb8-93be-b1f419dc10e3', url: 'https://www.youtube.com/watch?v=nqTcAzPS3oc' }, // Découvrir l'écosystème Apple et installer Xcode
    { id: '3d906df7-18e1-44ca-8b59-a6684c06ff5c', url: 'https://www.youtube.com/watch?v=yuo50-TiKgo' }, // Comprendre la syntaxe de base de Swift
    { id: '27cc9262-8994-4e9c-8510-6b0bd84d10af', url: 'https://www.youtube.com/watch?v=yuo50-TiKgo' }, // Structurer son code avec les fonctions
    { id: '95bd62bb-d3e5-43fe-984d-e4446e1e6f20', url: 'https://www.youtube.com/watch?v=yuo50-TiKgo' }, // Les types optionnels et la gestion des valeurs nulles
    { id: '215ef886-406e-4148-81ce-a1ca5ef11ca1', url: 'https://www.youtube.com/watch?v=yuo50-TiKgo' }, // Manipuler les collections avec Tableaux et Dictionnaires
    { id: 'a292a18a-af3a-405d-8e3c-0dbe68cc72ea', url: 'https://www.youtube.com/watch?v=yuo50-TiKgo' }, // Le modelage de données avec les Structures
    { id: 'fa0276d1-4dbd-4a17-80be-26cb49377cd0', url: 'https://www.youtube.com/watch?v=8Xcq4yRQ0pU' }, // Anatomie d'un projet Xcode et ses fichiers
    { id: 'cf44e131-0df0-4a8f-a96c-8507b960cd3b', url: 'https://www.youtube.com/watch?v=8Xcq4yRQ0pU' }, // Configurer les cibles et les build settings
    { id: 'c90cc328-9d51-4089-a226-c23f4625b809', url: 'https://www.youtube.com/watch?v=8Xcq4yRQ0pU' }, // Maîtriser le débogueur et les breakpoints
    { id: '7aa272dc-dfaa-43ec-80c7-0e69dfb4a457', url: 'https://www.youtube.com/watch?v=8Xcq4yRQ0pU' }, // Gérer les dépendances avec Swift Package Manager
    { id: '266c8024-5ef9-408a-86a0-5cb95d5223a5', url: 'https://www.youtube.com/watch?v=8Xcq4yRQ0pU' }, // Utiliser les Instruments pour optimiser les performances
    { id: 'c3732049-5f25-4687-9576-ff7a4c7e6c31', url: 'https://www.youtube.com/watch?v=Fz6hbH-t0eM' }, // Organiser le code avec les extensions et les protocoles
    { id: '5cfefec4-d1ec-4c07-b24d-621aa0f97120', url: 'https://www.youtube.com/watch?v=4GjXq2Sr55Q' }, // Définir les classes et comprendre l'héritage
    { id: 'c7c8ef4c-352b-42fa-90f7-11ef8d71d37b', url: 'https://www.youtube.com/watch?v=4GjXq2Sr55Q' }, // Les modèles de conception en Swift
    { id: 'ff83a042-45e0-4966-ac28-be5bc06ccaa3', url: 'https://www.youtube.com/watch?v=4GjXq2Sr55Q' }, // Gérer les cycles de vie avec ARC
    { id: 'b2255743-4eab-4d43-bbcb-1e1b590e8c25', url: 'https://www.youtube.com/watch?v=4GjXq2Sr55Q' }, // Le pattern Delegate et la communication entre objets
    { id: '90013b1f-7bb9-444f-8360-1e52fdbbe7e8', url: 'https://www.youtube.com/watch?v=W947iXBIFu4' }, // Les generics et la réutilisabilité du code
    { id: '85542b58-e325-4c03-bcba-be89f4175394', url: 'https://www.youtube.com/watch?v=W947iXBIFu4' }, // Combiner les classes et les protocoles pour une architecture solide
    { id: '00f6ee84-48e0-47de-824f-ef1dbbe65a26', url: 'https://www.youtube.com/watch?v=F2ojC6TNwws' }, // Comprendre Interface Builder et les Storyboards
    { id: '097c0f16-f332-4752-ac01-c88f1ae431b8', url: 'https://www.youtube.com/watch?v=F2ojC6TNwws' }, // Créer des layouts avec Auto Layout et les contraintes
    { id: '0da2c9e7-44bc-4187-8fb2-7a70a59a7fdb', url: 'https://www.youtube.com/watch?v=F2ojC6TNwws' }, // Personnaliser les UIView et les composants réutilisables
    { id: 'd03d3c8c-12f7-4cbe-b472-e1d88a4ff821', url: 'https://www.youtube.com/watch?v=F2ojC6TNwws' }, // Animer les interfaces avec Core Animation
    { id: '716a5d4a-3bb1-4475-b6d6-fcf4b64f3c71', url: 'https://www.youtube.com/watch?v=F2ojC6TNwws' }, // Implémenter les UITableView et UICollectionView
    { id: '70cb071e-08bb-4416-834f-015ea1f2d22d', url: 'https://www.youtube.com/watch?v=F2ojC6TNwws' }, // Concevoir des écrans responsives pour tous les appareils
    { id: '84bdae36-f033-4f93-8cfb-6f8d070b4f84', url: 'https://www.youtube.com/watch?v=HyQgpxX__-A' }, // Les principes fondamentaux de SwiftUI
    { id: 'e207908b-625d-44a3-834c-6dfd5ac561ae', url: 'https://www.youtube.com/watch?v=ayn9CdqbI_Y' }, // Les propriétés enveloppantes de SwiftUI
    { id: 'ebfbc2d9-10cf-46d7-93be-efbf573d8bb2', url: 'https://www.youtube.com/watch?v=ayn9CdqbI_Y' }, // Construire des interfaces avec les vues SwiftUI
    { id: 'db320e89-138b-4c07-b248-beea6de72504', url: 'https://www.youtube.com/watch?v=ayn9CdqbI_Y' }, // La pile de navigation et les sheets en SwiftUI
    { id: '3817f54c-7c05-4b00-ae92-7f722a8740e5', url: 'https://www.youtube.com/watch?v=4GjXq2Sr55Q' }, // Gérer l'état global avec les ViewModels
    { id: 'c3c07221-fbb3-41bb-a5a4-998dbb9ffc23', url: 'https://www.youtube.com/watch?v=-VC3hIEL7eQ' }, // Styliser les interfaces avec les thèmes et les modificateurs

    // Applications Web Modernes avec Next.js
    { id: '792f3928-8772-46be-a764-f622fb4864c2', url: 'https://www.youtube.com/watch?v=ZVnjopwW4ZA' }, // Architecture fondamentale de l'App Router dans Next.js
    { id: '900e5720-305d-4f05-88e5-3fbc71168fbc', url: 'https://www.youtube.com/watch?v=ZVnjopwW4ZA' }  // Création de routes avec la convention de fichiers du dossier app
  ];

  for (const u of updates) {
    await c.query('UPDATE lessons SET video_url=$1, lesson_type=$2, updated_at=NOW() WHERE id=$3', [u.url, 'video', u.id]);
  }

  const res = await c.query('SELECT count(*) FROM lessons WHERE video_url IS NOT NULL');
  console.log('Total lessons with video_url now:', res.rows[0].count);

  await c.end();
}

run().catch(console.error);
