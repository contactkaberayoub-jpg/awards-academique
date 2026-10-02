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

  const triggers = await client.query(`
    SELECT tgname, pg_get_triggerdef(t.oid) AS def
    FROM pg_trigger t
    WHERE NOT t.tgisinternal
    ORDER BY tgname`);
  console.log('=== TRIGGERS ===');
  for (const r of triggers.rows) console.log(`-- ${r.tgname}\n${r.def}\n`);

  const funcs = await client.query(`
    SELECT p.proname, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('fn_auto_generate_certificate','fn_score_quiz_attempt','fn_generate_certificate_number')
    ORDER BY p.proname`);
  console.log('=== FUNCTIONS ===');
  for (const r of funcs.rows) { console.log(`-- ${r.proname}\n${r.def}\n`); }

  await client.end();
}

main().catch((e) => { console.error('ERR', e); process.exit(1); });