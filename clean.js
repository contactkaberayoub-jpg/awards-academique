const { Client } = require('pg');
const c = new Client({host:'aws-0-eu-west-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.wquicdlbtbcsivyqdltx',password:'kaberayuub7',ssl:{rejectUnauthorized:false}});
async function clean() {
  await c.connect();
  // Fix invalid URLs or duplicates if any, and synchronize lesson_type
  await c.query(`UPDATE lessons SET lesson_type = 'video' WHERE video_url IS NOT NULL AND lesson_type != 'video'`);
  await c.query(`UPDATE lessons SET lesson_type = 'text', video_url = NULL WHERE video_url IS NULL AND lesson_type = 'video'`);
  const res = await c.query('SELECT count(*) FROM lessons WHERE (video_url IS NOT NULL AND lesson_type != \'video\') OR (video_url IS NULL AND lesson_type = \'video\')');
  console.log('Inconsistent types remaining:', res.rows[0].count);
  await c.end();
}
clean().catch(console.error);
