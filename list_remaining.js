const { Client } = require('pg');
const fs = require('fs');

const c = new Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.wquicdlbtbcsivyqdltx', password: 'kaberayuub7', ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();
  const res = await c.query(`
    SELECT l.id, l.title as lesson_title, s.title as section_title, c.title as course_title,
           c.id as course_id, s.id as section_id
    FROM lessons l
    JOIN course_sections s ON l.section_id = s.id
    JOIN courses c ON s.course_id = c.id
    WHERE c.is_active = true AND c.status = 'published' AND c.published = true AND l.video_url IS NULL
    ORDER BY c.title, s.display_order, l.display_order
  `);
  fs.writeFileSync('lessons_needing_urls.json', JSON.stringify(res.rows, null, 2));
  console.log('Total needing URLs:', res.rows.length);
  console.log('By course:');
  const byCourse = {};
  res.rows.forEach(l => { byCourse[l.course_title] = (byCourse[l.course_title] || 0) + 1; });
  Object.entries(byCourse).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ' + v + ' - ' + k));
  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });
