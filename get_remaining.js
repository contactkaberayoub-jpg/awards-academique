const { Client } = require('pg');
const fs = require('fs');
const c = new Client({host:'aws-0-eu-west-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.wquicdlbtbcsivyqdltx',password:'kaberayuub7',ssl:{rejectUnauthorized:false}});
c.connect().then(()=>c.query(`SELECT l.id,l.title as lesson_title,s.title as section_title,c.title as course_title FROM lessons l JOIN course_sections s ON l.section_id=s.id JOIN courses c ON s.course_id=c.id WHERE c.is_active=true AND c.status='published' AND c.published=true AND l.video_url IS NULL ORDER BY c.title,s.display_order,l.display_order`)).then(r=>{
  fs.writeFileSync('remaining_lessons.json',JSON.stringify(r.rows));
  console.log('Total remaining:',r.rows.length);
  const courses={};
  r.rows.forEach(l=>{if(!courses[l.course_title])courses[l.course_title]=[];courses[l.course_title].push(l)});
  const sorted=Object.entries(courses).sort((a,b)=>a[0].localeCompare(b[0]));
  sorted.forEach(([k,v])=>console.log(v.length+' - '+k));
  c.end();
});
