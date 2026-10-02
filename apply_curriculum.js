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

async function updateBatch(updates) {
  let ok = 0, fail = 0;
  for (const u of updates) {
    try {
      await c.query(
        'UPDATE lessons SET title=$1, content=$2, lesson_type=$3, video_url=$4, updated_at=NOW() WHERE id=$5',
        [u.title, u.content, u.lesson_type || 'text', u.video_url || null, u.id]
      );
      ok++;
    } catch(e) { fail++; console.error('FAIL ' + u.id + ': ' + e.message); }
  }
  return { ok, fail };
}

async function main() {
  const args = process.argv.slice(2);
  const batchFile = args[0];
  if (!batchFile) { console.error('Usage: node apply_curriculum.js <batch_file.js>'); process.exit(1); }
  
  await c.connect();
  console.log('Connected to database');
  
  const updates = require('./' + batchFile);
  console.log('Loaded ' + updates.length + ' lesson updates from ' + batchFile);
  
  const result = await updateBatch(updates);
  console.log('Results: ' + result.ok + ' updated, ' + result.fail + ' failed');
  
  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
