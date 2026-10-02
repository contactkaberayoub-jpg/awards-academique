const { Client } = require('pg');
const c = new Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.wquicdlbtbcsivyqdltx',
  password: 'kaberayuub7',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  await c.connect();
  const res = await c.query(`
    SELECT c.id, c.title,
      COUNT(l.id) as total_lessons,
      COUNT(CASE WHEN l.title LIKE 'Définir les concepts%' OR l.title LIKE 'Comprendre les mécanismes%' OR l.title LIKE 'Mettre en pratique%' OR l.title LIKE 'Résoudre un problème%' OR l.title LIKE 'Évaluer une solution%' OR l.title LIKE 'Réaliser un mini-atelier%' THEN 1 END) as placeholder_titles
    FROM courses c
    JOIN course_sections s ON s.course_id = c.id
    JOIN lessons l ON l.section_id = s.id
    WHERE c.is_active = true AND c.status = 'published' AND c.published = true
    GROUP BY c.id, c.title
    ORDER BY c.title
  `);
  
  console.log('Total published courses:', res.rows.length);
  let doneCount = 0;
  let pendingCount = 0;
  for (const row of res.rows) {
    const isDone = parseInt(row.placeholder_titles, 10) === 0;
    if (isDone) doneCount++; else pendingCount++;
    console.log(`${row.title} (${row.total_lessons} lessons) -> ${isDone ? 'DONE' : 'PENDING: ' + row.placeholder_titles + ' placeholders'}`);
  }
  console.log(`\nSummary: ${doneCount} DONE, ${pendingCount} PENDING`);
  await c.end();
})().catch(console.error);
