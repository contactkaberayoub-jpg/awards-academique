const { Client } = require('pg');

const client = new Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.wquicdlbtbcsivyqdltx',
  password: 'kaberayuub7',
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();

  const courses = (await client.query(`
    SELECT c.id, c.title
    FROM courses c WHERE c.status = 'published' AND c.published = true
    ORDER BY c.created_at DESC
  `)).rows;

  console.log('=== COURSE x ENROLLMENT PROGRESSION AUDIT ===\n');

  for (const course of courses) {
    const sections = (await client.query(`SELECT id FROM course_sections WHERE course_id = $1`, [course.id])).rows;
    const secIds = sections.map(s => s.id);
    let lessons = [];
    if (secIds.length) {
      lessons = (await client.query(
        `SELECT id FROM lessons WHERE section_id = ANY($1) AND delete_at IS NULL`,
        [secIds])).rows;
    }
    const quizzes = (await client.query(
      `SELECT id, lesson_id, status, passing_score FROM quizzes WHERE course_id = $1`,
      [course.id])).rows;
    const courseLevelQuizzes = quizzes.filter(q => q.lesson_id === null && q.status === 'published');
    const enr = (await client.query(
      `SELECT e.id, e.user_id, e.status, e.completion_percentage, e.completed_at, u.email
       FROM enrollments e JOIN users u ON u.id = e.user_id WHERE e.course_id = $1`,
      [course.id])).rows;

    if (enr.length === 0) continue;

    for (const e of enr) {
      // Computed progress per the pipeline source of truth
      let completedLessons = 0;
      if (lessons.length) {
        const r = await client.query(
          `SELECT count(*)::int AS n FROM lesson_progress lp
           WHERE lp.enrollment_id = $1 AND lp.lesson_id = ANY($2) AND lp.is_completed = true`,
          [e.id, lessons.map(l => l.id)]);
        completedLessons = r.rows[0].n;
      }
      const totalSteps = lessons.length + quizzes.filter(q => q.lesson_id !== null && q.status === 'published').length;
      let completedSteps = completedLessons;
      for (const q of quizzes.filter(x => x.lesson_id !== null && x.status === 'published')) {
        const r = await client.query(
          `SELECT count(*)::int AS n FROM quiz_attempts qa WHERE qa.quiz_id = $1 AND qa.user_id = $2 AND qa.status='passed' AND qa.score >= COALESCE($3,0)`,
          [q.id, e.user_id, q.passing_score]);
        if (r.rows[0].n > 0) completedSteps++;
      }
      let finalAllPassed = true;
      for (const q of courseLevelQuizzes) {
        const r = await client.query(
          `SELECT count(*)::int AS n FROM quiz_attempts qa WHERE qa.quiz_id = $1 AND qa.user_id = $2 AND qa.status='passed' AND qa.score >= COALESCE($3,0)`,
          [q.id, e.user_id, q.passing_score]);
        if (r.rows[0].n === 0) { finalAllPassed = false; break; }
      }
      const lessonPct = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
      const computedPct = courseLevelQuizzes.length > 0
        ? Math.round((lessonPct * 0.70 + (finalAllPassed ? 30 : 0)) * 100) / 100
        : Math.round(lessonPct * 100) / 100;

      const persistedPct = parseFloat(e.completion_percentage);
      const mismatch = persistedPct !== computedPct || (e.status === 'completed' && computedPct < 100);

      const cert = (await client.query(
        `SELECT count(*)::int AS n FROM certificates WHERE user_id = $1 AND course_id = $2`,
        [e.user_id, course.id])).rows[0].n;

      console.log(`COURSE: ${course.title} (${course.id.slice(0,8)})`);
      console.log(`  enroll ${e.status} persisted=${persistedPct} computed=${computedPct} lessons=${completedLessons}/${lessons.length} steps=${completedSteps}/${totalSteps} courseLevelQuizzes=${courseLevelQuizzes.length} finalPassed=${finalAllPassed} cert=${cert}`);
      if (mismatch) console.log(`  *** MISMATCH ${mismatch} ***`);
      console.log('');
    }
  }

  await client.end();
}

main().catch((e) => { console.error('ERR', e); process.exit(1); });