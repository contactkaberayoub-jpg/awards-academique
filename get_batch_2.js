const { Client } = require('pg');
const fs = require('fs');
const c = new Client({host:'aws-0-eu-west-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.wquicdlbtbcsivyqdltx',password:'kaberayuub7',ssl:{rejectUnauthorized:false}});
c.connect().then(()=>c.query(`SELECT l.id,l.title as lesson_title,s.title as section_title,c.title as course_title FROM lessons l JOIN course_sections s ON l.section_id=s.id JOIN courses c ON s.course_id=c.id WHERE c.is_active=true AND c.status='published' AND c.published=true AND l.video_url IS NULL ORDER BY c.title,s.display_order,l.display_order LIMIT 50`)).then(r=>{
  fs.writeFileSync('batch_2.json',JSON.stringify(r.rows,null,2));
  console.log('Batch 2 lessons:',r.rows.length);
  r.rows.forEach((l,i)=>console.log(`${i+1}. [${l.course_title} > ${l.section_title}] ${l.lesson_title}`));
  c.end();
});
