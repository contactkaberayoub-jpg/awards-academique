const { Client } = require('pg');
const c = new Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.wquicdlbtbcsivyqdltx', password: 'kaberayuub7', ssl: { rejectUnauthorized: false }
});
(async () => {
  await c.connect();
  // Get all lessons with context, grouped by course/section
  const res = await c.query(`
    SELECT l.id, l.title, l.lesson_type, l.video_url, l.display_order,
           s.title as section_title, s.display_order as section_order,
           c.title as course_title
    FROM lessons l
    JOIN course_sections s ON l.section_id = s.id
    JOIN courses c ON s.course_id = c.id
    WHERE c.is_active = true AND c.status = 'published' AND c.published = true
    ORDER BY c.title, s.display_order, l.display_order
  `);
  const lessons = res.rows;
  console.log('Total lessons:', lessons.length);
  
  // Count current state
  let withVideo = 0, withoutVideo = 0;
  for (const l of lessons) {
    if (l.video_url) withVideo++; else withoutVideo++;
  }
  console.log('With video_url:', withVideo);
  console.log('Without video_url:', withoutVideo);
  
  // Group by course title for context
  const courses = new Map();
  for (const l of lessons) {
    if (!courses.has(l.course_title)) courses.set(l.course_title, []);
    courses.get(l.course_title).push(l);
  }
  console.log('Courses:', courses.size);
  
  // Write lessons to file for processing
  require('fs').writeFileSync('all_lessons.json', JSON.stringify(lessons, null, 2));
  console.log('Written to all_lessons.json');
  
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
