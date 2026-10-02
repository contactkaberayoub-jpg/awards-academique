const { Client } = require('pg');
const fs = require('fs');

const c = new Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.wquicdlbtbcsivyqdltx',
  password: 'kaberayuub7',
  ssl: { rejectUnauthorized: false }
});

async function getLessonsByCourse(courseTitle) {
  const res = await c.query(`
    SELECT l.id, l.display_order, s.display_order as section_order, s.title as section_title
    FROM lessons l
    JOIN course_sections s ON l.section_id = s.id
    JOIN courses c ON s.course_id = c.id
    WHERE c.title = $1
    ORDER BY s.display_order, l.display_order
  `, [courseTitle]);
  return res.rows;
}

async function applyUpdates(updates) {
  let ok = 0, fail = 0;
  for (const u of updates) {
    try {
      await c.query(
        'UPDATE lessons SET title=$1, content=$2, lesson_type=$3, video_url=$4, updated_at=NOW() WHERE id=$5',
        [u.title, u.content, u.lesson_type || 'text', u.video_url || null, u.id]
      );
      ok++;
    } catch(e) { fail++; }
  }
  return { ok, fail };
}

async function checkPlaceholders() {
  const res = await c.query(`
    SELECT c.title,
      COUNT(l.id) as total,
      COUNT(CASE WHEN l.title LIKE 'Définir les concepts%' OR l.title LIKE 'Comprendre les mécanismes%' OR l.title LIKE 'Mettre en pratique%' OR l.title LIKE 'Résoudre un problème%' OR l.title LIKE 'Évaluer une solution%' OR l.title LIKE 'Réaliser un mini-atelier%' THEN 1 END) as placeholders
    FROM courses c
    JOIN course_sections s ON s.course_id = c.id
    JOIN lessons l ON l.section_id = s.id
    WHERE c.is_active = true AND c.status = 'published' AND c.published = true
    GROUP BY c.id, c.title
    ORDER BY c.title
  `);
  return res.rows;
}

module.exports = { getLessonsByCourse, applyUpdates, checkPlaceholders };
