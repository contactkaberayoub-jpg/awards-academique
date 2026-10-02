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
            if (vidMatch) resolve([{ id: vidMatch[1], title: '' }]);
            else resolve([]);
            return;
          }
          const ytData = JSON.parse(match[1]);
          const tabs = ytData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
          if (!tabs) { resolve([]); return; }
          const results = [];
          for (const tab of tabs) {
            const items = tab?.itemSectionRenderer?.contents;
            if (!items) continue;
            for (const item of items) {
              if (item.videoRenderer && item.videoRenderer.videoId) {
                results.push({ id: item.videoRenderer.videoId, title: item.videoRenderer.title?.runs?.[0]?.text || '' });
                if (results.length >= 3) break;
              }
            }
            if (results.length >= 3) break;
          }
          resolve(results);
        } catch (e) { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(10000, () => { req.destroy(); resolve([]); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const batchSize = parseInt(process.argv[2] || '100');
  await c.connect();

  const progressFile = 'video_progress.json';
  let processed = new Set();
  if (fs.existsSync(progressFile)) {
    processed = new Set(JSON.parse(fs.readFileSync(progressFile, 'utf8')).processed || []);
  }

  const res = await c.query(`
    SELECT l.id, l.title, l.video_url, s.title as section_title, c.title as course_title
    FROM lessons l
    JOIN course_sections s ON l.section_id = s.id
    JOIN courses c ON s.course_id = c.id
    WHERE c.is_active = true AND c.status = 'published' AND c.published = true AND l.video_url IS NULL
    ORDER BY c.title, s.display_order, l.display_order
  `);

  const lessons = res.rows.filter(l => !processed.has(l.id));
  const batch = lessons.slice(0, batchSize);
  console.log(`Processing ${batch.length} of ${lessons.length} remaining`);

  let found = 0, notFound = 0;

  for (let i = 0; i < batch.length; i++) {
    const l = batch[i];
    const query = l.title;
    const results = await searchYouTube(query);

    if (results.length > 0) {
      const best = results[0];
      const videoUrl = 'https://www.youtube.com/watch?v=' + best.id;
      try {
        await c.query('UPDATE lessons SET video_url=$1, lesson_type=$2, updated_at=NOW() WHERE id=$3',
          [videoUrl, 'video', l.id]);
        found++;
      } catch (e) {}
    } else {
      notFound++;
    }

    processed.add(l.id);

    if ((i + 1) % 10 === 0) {
      console.log(`  ${i + 1}/${batch.length} found=${found} notFound=${notFound}`);
      fs.writeFileSync(progressFile, JSON.stringify({ processed: Array.from(processed) }));
    }
    await sleep(3000);
  }

  fs.writeFileSync(progressFile, JSON.stringify({ processed: Array.from(processed) }));
  console.log(`Batch done: found=${found}, notFound=${notFound}`);
  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
