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

(async () => {
  await c.connect();

  const r = await c.query(`
    SELECT 
      c.id as course_id, c.title as course_title, c.description as course_desc, c.level as course_level,
      s.id as section_id, s.title as section_title, s.display_order as section_order,
      l.id as lesson_id, l.title as lesson_title, l.content, l.lesson_type, l.video_url, 
      l.status, l.display_order, l.duration_minutes, l.is_free_preview
    FROM courses c
    JOIN course_sections s ON s.course_id = c.id
    JOIN lessons l ON l.section_id = s.id
    WHERE c.is_active = true AND c.status = 'published' AND c.published = true
    ORDER BY c.title, s.display_order, l.display_order
  `);

  // Structure into courses -> sections -> lessons
  const coursesMap = new Map();
  for (const row of r.rows) {
    if (!coursesMap.has(row.course_id)) {
      coursesMap.set(row.course_id, {
        id: row.course_id,
        title: row.course_title,
        description: row.course_desc,
        level: row.course_level,
        sections: new Map()
      });
    }
    const course = coursesMap.get(row.course_id);
    if (!course.sections.has(row.section_id)) {
      course.sections.set(row.section_id, {
        id: row.section_id,
        title: row.section_title,
        display_order: row.section_order,
        lessons: []
      });
    }
    course.sections.get(row.section_id).lessons.push({
      id: row.lesson_id,
      title: row.lesson_title,
      content: row.content,
      lesson_type: row.lesson_type,
      video_url: row.video_url,
      status: row.status,
      display_order: row.display_order,
      duration_minutes: row.duration_minutes,
      is_free_preview: row.is_free_preview
    });
  }

  const result = Array.from(coursesMap.values()).map(c => ({
    ...c,
    sections: Array.from(c.sections.values())
  }));

  fs.writeFileSync('all_data.json', JSON.stringify(result, null, 2));
  
  let totalLessons = 0;
  let totalSections = 0;
  for (const course of result) {
    totalSections += course.sections.length;
    for (const section of course.sections) {
      totalLessons += section.lessons.length;
    }
  }
  console.log('Courses: ' + result.length + ', Sections: ' + totalSections + ', Lessons: ' + totalLessons);
  
  for (const course of result) {
    let cl = 0;
    for (const s of course.sections) cl += s.lessons.length;
    console.log(course.title + ': ' + course.sections.length + ' sections, ' + cl + ' lessons');
  }

  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
