const https = require('https');
const { Client } = require('pg');
const fs = require('fs');

const c = new Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.wquicdlbtbcsivyqdltx', password: 'kaberayuub7', ssl: { rejectUnauthorized: false }
});

const COOKIE = 'CONSENT=PENDING+987; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjMwODI5LjA3X3AxGgJlbiACGgYIgJnsBhAB';

function searchYouTube(query) {
  return new Promise((resolve) => {
    const url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query) + '&sp=EgIQAQ%3D%3D';
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
        'Cookie': COOKIE
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const match = data.match(/var ytInitialData = ({.*?});<\/script>/s);
          if (!match) {
            const vidMatch = data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
            if (vidMatch) resolve({ id: vidMatch[1], title: '' });
            else resolve(null);
            return;
          }
          const ytData = JSON.parse(match[1]);
          const tabs = ytData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
          if (!tabs) { resolve(null); return; }
          for (const tab of tabs) {
            const items = tab?.itemSectionRenderer?.contents;
            if (!items) continue;
            for (const item of items) {
              if (item.videoRenderer && item.videoRenderer.videoId) {
                resolve({ id: item.videoRenderer.videoId, title: item.videoRenderer.title?.runs?.[0]?.text || '' });
                return;
              }
            }
          }
          resolve(null);
        } catch (e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Main: load websearch results from file, apply to DB
async function main() {
  const mode = process.argv[2];
  await c.connect();
  
  if (mode === 'apply') {
    // Mode: apply pre-found video URLs from websearch_results.json
    const data = JSON.parse(fs.readFileSync('websearch_results.json', 'utf8'));
    let ok = 0, fail = 0;
    for (const r of data) {
      try {
        await c.query('UPDATE lessons SET video_url = $1, lesson_type = $2, updated_at = NOW() WHERE id = $3 AND video_url IS NULL',
          [r.video_url, 'video', r.id]);
        ok++;
      } catch (e) { fail++; }
    }
    console.log('Applied:', ok, 'Failed:', fail);
  } else if (mode === 'scrape') {
    // Mode: scrape YouTube for all lessons without video_url
    const progressFile = 'video_progress.json';
    let processed = new Set();
    if (fs.existsSync(progressFile)) {
      processed = new Set(JSON.parse(fs.readFileSync(progressFile, 'utf8')).processed || []);
    }
    
    const res = await c.query(`
      SELECT l.id, l.title, l.course_title, l.video_url FROM (
        SELECT l.id, l.title, l.video_url, c.title as course_title
        FROM lessons l
        JOIN course_sections s ON l.section_id = s.id
        JOIN courses c ON s.course_id = c.id
        WHERE c.is_active = true AND c.status = 'published' AND c.published = true AND l.video_url IS NULL
      ) l
      ORDER BY l.course_title, l.title
    `);
    
    const lessons = res.rows.filter(l => !processed.has(l.id));
    console.log('To process:', lessons.length);
    
    let found = 0, notFound = 0;
    for (let i = 0; i < lessons.length; i++) {
      const l = lessons[i];
      const result = await searchYouTube(l.title + ' ' + l.course_title);
      if (result && result.id) {
        try {
          await c.query('UPDATE lessons SET video_url = $1, lesson_type = $2, updated_at = NOW() WHERE id = $3',
            ['https://www.youtube.com/watch?v=' + result.id, 'video', l.id]);
          found++;
        } catch (e) {}
      } else {
        notFound++;
      }
      processed.add(l.id);
      if (i % 20 === 0) {
        console.log(`  ${i}/${lessons.length} found=${found} notFound=${notFound}`);
        fs.writeFileSync(progressFile, JSON.stringify({ processed: Array.from(processed) }));
      }
      await sleep(2000);
    }
    fs.writeFileSync(progressFile, JSON.stringify({ processed: Array.from(processed) }));
    console.log(`DONE: found=${found} notFound=${notFound}`);
  }
  
  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
