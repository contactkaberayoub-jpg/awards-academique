const { Client } = require('pg');
const c = new Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.wquicdlbtbcsivyqdltx', password: 'kaberayuub7', ssl: { rejectUnauthorized: false }
});

async function run() {
  await c.connect();

  const updates = [
    { id: '4a8c1bdc-cf9c-4bab-b6d6-ec65cfab0f31', url: 'https://www.youtube.com/watch?v=_evjr9sg-w0' }, // pg_stat_statements
    { id: '150b0e49-8ac6-407f-be69-fba2924be121', url: 'https://www.youtube.com/watch?v=LUOABmmFfRY' }, // partitioning
    { id: 'b4f4b975-f332-400d-b376-3acce414b2fb', url: 'https://www.youtube.com/watch?v=nzX7yZRhRcU' }, // pgbench
    { id: '31436512-f6d4-41c6-854f-b46ab0ae57cb', url: 'https://www.youtube.com/watch?v=Q56kljmIN14' }, // architecture
    { id: '2c727089-b389-48f1-884f-fac44e0fef4a', url: 'https://www.youtube.com/watch?v=iwzc6sDqfX8' }  // migration
  ];

  for (const u of updates) {
    await c.query('UPDATE lessons SET video_url=$1, lesson_type=$2, updated_at=NOW() WHERE id=$3', [u.url, 'video', u.id]);
  }

  const res = await c.query('SELECT id, title, video_url, lesson_type FROM lessons WHERE id = ANY($1)', [updates.map(x => x.id)]);
  console.log('Verified updates in DB:');
  res.rows.forEach(r => console.log(`  [${r.lesson_type}] ${r.title} -> ${r.video_url}`));

  await c.end();
}

run().catch(console.error);
