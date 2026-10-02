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

  // 1. Get all active courses with category info
  const courses = await c.query(`
    SELECT c.id, c.title, c.subtitle, c.description, c.level, c.status, c.is_active, c.published, c.category_id,
           cat.name as category_name
    FROM courses c
    LEFT JOIN categories cat ON c.category_id = cat.id
    WHERE c.is_active = true
    ORDER BY c.created_at
  `);
  console.log('\n=== ACTIVE COURSES ===');
  for (const row of courses.rows) {
    console.log(`ID: ${row.id}`);
    console.log(`  Title: ${row.title}`);
    console.log(`  Subtitle: ${row.subtitle}`);
    console.log(`  Level: ${row.level} | Status: ${row.status} | Published: ${row.published} | Active: ${row.is_active}`);
    console.log(`  Category: ${row.category_name} (${row.category_id})`);
    console.log(`  Description: ${(row.description || '').substring(0, 200)}`);
    console.log('');
  }

  // 2. Get all sections
  const sections = await c.query(`
    SELECT s.id, s.course_id, s.title, s.display_order,
           c.title as course_title
    FROM course_sections s
    JOIN courses c ON s.course_id = c.id
    WHERE c.is_active = true
    ORDER BY c.title, s.display_order
  `);
  console.log('\n=== SECTIONS ===');
  for (const row of sections.rows) {
    console.log(`[${row.course_title}] ${row.title} (order: ${row.display_order}, id: ${row.id})`);
  }

  // 3. Get all lessons with their section and course info
  const lessons = await c.query(`
    SELECT l.id, l.section_id, l.title, l.content, l.lesson_type, l.video_url, 
           l.status, l.display_order, l.duration_minutes, l.is_free_preview,
           s.title as section_title, s.course_id,
           c.title as course_title
    FROM lessons l
    JOIN course_sections s ON l.section_id = s.id
    JOIN courses c ON s.course_id = c.id
    WHERE c.is_active = true
    ORDER BY c.title, s.display_order, l.display_order
  `);
  
  console.log('\n=== LESSONS (count: ' + lessons.rows.length + ') ===');
  let prevCourse = '';
  let prevSection = '';
  for (const row of lessons.rows) {
    if (row.course_title !== prevCourse) {
      console.log(`\n--- COURSE: ${row.course_title} ---`);
      prevCourse = row.course_title;
      prevSection = '';
    }
    if (row.section_title !== prevSection) {
      console.log(`  SECTION: ${row.section_title}`);
      prevSection = row.section_title;
    }
    const contentPreview = (row.content || '').substring(0, 150).replace(/\n/g, ' ');
    const hasVideo = row.video_url ? ' [VIDEO: ' + row.video_url.substring(0, 50) + ']' : '';
    console.log(`    ${row.display_order}. [${row.lesson_type}] ${row.title} (status: ${row.status}${hasVideo})`);
    console.log(`       Content preview: ${contentPreview}...`);
  }

  // 4. Count lesson resources
  const resources = await c.query(`
    SELECT lr.lesson_id, lr.title, lr.resource_type, lr.file_url,
           l.title as lesson_title
    FROM lesson_resources lr
    JOIN lessons l ON lr.lesson_id = l.id
    JOIN course_sections s ON l.section_id = s.id
    JOIN courses c ON s.course_id = c.id
    WHERE c.is_active = true
  `);
  console.log('\n=== LESSON RESOURCES (count: ' + resources.rows.length + ') ===');
  for (const row of resources.rows) {
    console.log(`  ${row.lesson_title}: ${row.title} (${row.resource_type}) -> ${row.file_url.substring(0, 80)}`);
  }

  // 5. Count stats
  const stats = await c.query(`
    SELECT 
      (SELECT COUNT(*) FROM courses WHERE is_active = true) as total_courses,
      (SELECT COUNT(*) FROM course_sections s JOIN courses c ON s.course_id = c.id WHERE c.is_active = true) as total_sections,
      (SELECT COUNT(*) FROM lessons l JOIN course_sections s ON l.section_id = s.id JOIN courses c ON s.course_id = c.id WHERE c.is_active = true) as total_lessons,
      (SELECT COUNT(*) FROM lessons l JOIN course_sections s ON l.section_id = s.id JOIN courses c ON s.course_id = c.id WHERE c.is_active = true AND l.lesson_type = 'video') as video_lessons,
      (SELECT COUNT(*) FROM lessons l JOIN course_sections s ON l.section_id = s.id JOIN courses c ON s.course_id = c.id WHERE c.is_active = true AND l.lesson_type = 'text') as text_lessons,
      (SELECT COUNT(*) FROM lessons l JOIN course_sections s ON l.section_id = s.id JOIN courses c ON s.course_id = c.id WHERE c.is_active = true AND l.video_url IS NOT NULL) as lessons_with_video_url,
      (SELECT COUNT(*) FROM lessons l JOIN course_sections s ON l.section_id = s.id JOIN courses c ON s.course_id = c.id WHERE c.is_active = true AND l.content IS NULL OR l.content = '') as lessons_without_content
  `);
  console.log('\n=== STATS ===');
  console.log(JSON.stringify(stats.rows[0], null, 2));

  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
