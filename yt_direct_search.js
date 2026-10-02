const https = require('https');
const { Client } = require('pg');
const fs = require('fs');

const c = new Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.wquicdlbtbcsivyqdltx', password: 'kaberayuub7', ssl: { rejectUnauthorized: false }
});

const COOKIES = [
  'CONSENT=PENDING+987; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjMwODI5LjA3X3AxGgJlbiACGgYIgJnsBhAB',
  'CONSENT=PENDING+456; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjQwMTAxLjA1X3AxGgJlbiACGgYIgJnsBhAB',
  'CONSENT=PENDING+123; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjQwMjAxLjA5X3AxGgJlbiACGgYIgJnsBhAB'
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0'
];

function fetchUrl(url, attempt) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': USER_AGENTS[attempt % USER_AGENTS.length],
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml',
        'Cookie': COOKIES[attempt % COOKIES.length]
      }
    }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        fetchUrl(res.headers.location, attempt).then(resolve);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(''));
    req.setTimeout(15000, () => { req.destroy(); resolve(''); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractVideos(html) {
  if (!html || html.length < 2000) return [];
  try {
    const match = html.match(/var ytInitialData = ({.*?});<\/script>/s);
    if (!match) {
      const vidMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      if (vidMatch) return [{ id: vidMatch[1], title: '' }];
      return [];
    }
    const ytData = JSON.parse(match[1]);
    const tabs = ytData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    if (!tabs) return [];
    const results = [];
    for (const tab of tabs) {
      const items = tab?.itemSectionRenderer?.contents;
      if (!items) continue;
      for (const item of items) {
        if (item.videoRenderer && item.videoRenderer.videoId) {
          results.push({
            id: item.videoRenderer.videoId,
            title: item.videoRenderer.title?.runs?.[0]?.text || ''
          });
          if (results.length >= 6) break;
        }
      }
      if (results.length >= 6) break;
    }
    return results;
  } catch (e) { return []; }
}

function normalize(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function scoreMatch(lessonTitle, videoTitle) {
  const lt = normalize(lessonTitle);
  const vt = normalize(videoTitle);
  if (!lt || !vt) return 0;
  const words = lt.split(' ').filter(w => w.length > 3);
  let matches = 0;
  for (const w of words) {
    if (vt.includes(w)) matches++;
  }
  return words.length > 0 ? matches / words.length : 0;
}

async function main() {
  const mode = process.argv[2] || 'search';
  await c.connect();

  if (mode === 'search') {
    const progressFile = 'yt_search_progress.json';
    let progress = { videos: {}, searchedKeys: [] };
    if (fs.existsSync(progressFile)) {
      progress = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
    }

    const lessons = JSON.parse(fs.readFileSync('lessons_needing_urls.json', 'utf8'));
    const sections = {};
    lessons.forEach(l => {
      const key = l.course_title + '|||' + l.section_title;
      if (!sections[key]) sections[key] = { course: l.course_title, section: l.section_title };
    });

    const offset = parseInt(process.argv[3] || '0');
    const limit = parseInt(process.argv[4] || '10');
    const sectionKeys = Object.keys(sections);
    const batch = sectionKeys.slice(offset, offset + limit);

    let found = 0, failed = 0;
    for (let i = 0; i < batch.length; i++) {
      const key = batch[i];
      if (progress.searchedKeys.includes(key)) {
        console.log(`Skip (cached): ${key}`);
        continue;
      }

      const sec = sections[key];
      const query = sec.course + ' ' + sec.section;
      console.log(`[${i+1}/${batch.length}] Searching: ${query}`);

      const videos = await fetchUrl(
        'https://www.youtube.com/results?search_query=' + encodeURIComponent(query) + '&sp=EgIQAQ%3D%3D',
        i
      ).then(extractVideos);

      if (videos.length > 0) {
        progress.videos[key] = videos;
        found++;
        console.log(`  Found ${videos.length} videos`);
        for (const v of videos.slice(0, 3)) {
          console.log(`    ${v.id}: ${v.title.substring(0, 80)}`);
        }
      } else {
        failed++;
        console.log(`  No results (rate limited?)`);
      }

      progress.searchedKeys.push(key);

      if ((i + 1) % 3 === 0) {
        fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
      }

      await sleep(20000);
    }

    fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
    console.log(`\nBatch done: found=${found}, failed=${failed}, total cached=${progress.searchedKeys.length}`);
  }

  else if (mode === 'apply') {
    const progressFile = 'yt_search_progress.json';
    if (!fs.existsSync(progressFile)) { console.log('No progress file.'); await c.end(); return; }
    const progress = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
    const lessons = JSON.parse(fs.readFileSync('lessons_needing_urls.json', 'utf8'));

    let updated = 0, skipped = 0;
    for (const lesson of lessons) {
      const key = lesson.course_title + '|||' + lesson.section_title;
      const sectionVideos = progress.videos[key] || [];
      if (sectionVideos.length === 0) { skipped++; continue; }

      let bestMatch = null, bestScore = 0;
      for (const video of sectionVideos) {
        const score = scoreMatch(lesson.lesson_title, video.title);
        if (score > bestScore) { bestScore = score; bestMatch = video; }
      }

      if (bestMatch && bestScore >= 0.25) {
        const videoUrl = 'https://www.youtube.com/watch?v=' + bestMatch.id;
        try {
          await c.query('UPDATE lessons SET video_url=$1, lesson_type=$2, updated_at=NOW() WHERE id=$3',
            [videoUrl, 'video', lesson.id]);
          updated++;
        } catch (e) { console.error('DB error:', e.message); }
      } else {
        skipped++;
      }
    }

    console.log(`Applied: ${updated}, Skipped: ${skipped}`);
  }

  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
