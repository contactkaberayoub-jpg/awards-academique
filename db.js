const { Client } = require('pg');

const c = new Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.wquicdlbtbcsivyqdltx',
  password: 'kaberayuub7',
  ssl: { rejectUnauthorized: false }
});

async function connect() { await c.connect(); }
async function disconnect() { await c.end(); }

async function updateLessons(updates) {
  // updates: [{ id, title, content, lesson_type, video_url }]
  let success = 0;
  let failed = 0;
  for (const u of updates) {
    try {
      await c.query(
        'UPDATE lessons SET title=$1, content=$2, lesson_type=$3, video_url=$4, updated_at=NOW() WHERE id=$5',
        [u.title, u.content, u.lesson_type || 'text', u.video_url || null, u.id]
      );
      success++;
    } catch (e) {
      console.error('FAILED updating ' + u.id + ': ' + e.message);
      failed++;
    }
  }
  return { success, failed };
}

async function getLessonCounts() {
  const r = await c.query(`
    SELECT 
      (SELECT COUNT(*) FROM lessons l JOIN course_sections s ON l.section_id=s.id JOIN courses c ON s.course_id=c.id WHERE c.is_active=true AND c.status='published' AND c.published=true) as total,
      (SELECT COUNT(*) FROM lessons l JOIN course_sections s ON l.section_id=s.id JOIN courses c ON s.course_id=c.id WHERE c.is_active=true AND c.status='published' AND c.published=true AND l.lesson_type='video') as video_count,
      (SELECT COUNT(*) FROM lessons l JOIN course_sections s ON l.section_id=s.id JOIN courses c ON s.course_id=c.id WHERE c.is_active=true AND c.status='published' AND c.published=true AND l.video_url IS NOT NULL) as with_video_url,
      (SELECT COUNT(*) FROM lessons l JOIN course_sections s ON l.section_id=s.id JOIN courses c ON s.course_id=c.id WHERE c.is_active=true AND c.status='published' AND c.published=true AND l.lesson_type='video' AND l.video_url IS NULL) as video_no_url
  `);
  return r.rows[0];
}

module.exports = { connect, disconnect, updateLessons, getLessonCounts };
