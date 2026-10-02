const { Client } = require('pg');
const c = new Client({host:'aws-0-eu-west-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.wquicdlbtbcsivyqdltx',password:'kaberayuub7',ssl:{rejectUnauthorized:false}});
async function audit() {
  await c.connect();
  const total = await c.query('SELECT count(*) FROM lessons l JOIN course_sections s ON l.section_id=s.id JOIN courses c ON s.course_id=c.id WHERE c.is_active=true AND c.status=\'published\' AND c.published=true');
  const withVideo = await c.query('SELECT count(*) FROM lessons l JOIN course_sections s ON l.section_id=s.id JOIN courses c ON s.course_id=c.id WHERE c.is_active=true AND c.status=\'published\' AND c.published=true AND l.video_url IS NOT NULL');
  const nullVideo = await c.query('SELECT count(*) FROM lessons l JOIN course_sections s ON l.section_id=s.id JOIN courses c ON s.course_id=c.id WHERE c.is_active=true AND c.status=\'published\' AND c.published=true AND l.video_url IS NULL');
  const invalidUrls = await c.query('SELECT count(*) FROM lessons WHERE video_url IS NOT NULL AND video_url NOT LIKE \'https://www.youtube.com/watch?v=%\'');
  const duplicates = await c.query('SELECT video_url, count(*) FROM lessons WHERE video_url IS NOT NULL GROUP BY video_url HAVING count(*) > 1');
  const typeInconsistent = await c.query('SELECT count(*) FROM lessons WHERE (video_url IS NOT NULL AND lesson_type != \'video\') OR (video_url IS NULL AND lesson_type = \'video\')');

  console.log('=== FINAL AUDIT ===');
  console.log('Total active/published lessons:', total.rows[0].count);
  console.log('Lessons with video_url:', withVideo.rows[0].count);
  console.log('Lessons still NULL:', nullVideo.rows[0].count);
  console.log('Coverage percentage:', ((withVideo.rows[0].count / total.rows[0].count) * 100).toFixed(2) + '%');
  console.log('Invalid YouTube URLs:', invalidUrls.rows[0].count);
  console.log('Duplicate video URLs:', duplicates.rows.length);
  console.log('Content type inconsistent:', typeInconsistent.rows[0].count);

  await c.end();
}
audit().catch(console.error);
