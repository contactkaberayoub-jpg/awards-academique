const https = require('https');
const http = require('http');
const fs = require('fs');

function fetchJson(url, timeout) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: timeout || 10000
    }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        fetchJson(res.headers.location, timeout).then(resolve);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve(null); }
      });
    });
    req.on('error', (e) => { console.log(`  Error: ${e.message}`); resolve(null); });
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.r4fo.com',
  'https://api.piped.privacydev.net',
  'https://pipedapi.in.projectsegfau.lt',
  'https://watchapi.whatever.social',
  'https://pipedapi.us.projectsegfau.lt',
  'https://piped-api.lunar.icu'
];

async function searchYouTube(query) {
  for (const instance of PIPED_INSTANCES) {
    const url = `${instance}/search?q=${encodeURIComponent(query)}&filter=videos`;
    process.stdout.write(`  ${instance}... `);
    const data = await fetchJson(url, 15000);
    if (data && data.items && Array.isArray(data.items) && data.items.length > 0) {
      const videos = data.items
        .filter(i => i.type === 'stream' && i.url)
        .slice(0, 10)
        .map(r => ({
          id: r.url.replace('/watch?v=', ''),
          title: r.title || '',
          uploaderName: r.uploaderName || '',
          duration: r.duration || 0
        }));
      if (videos.length > 0) {
        console.log(`OK (${videos.length} videos)`);
        return videos;
      }
    }
    console.log(`fail`);
    await sleep(1000);
  }
  return [];
}

async function main() {
  const progressFile = 'pipd_progress.json';
  let progress = { videos: {}, searchedKeys: [] };
  if (fs.existsSync(progressFile)) {
    progress = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
  }

  const lessons = JSON.parse(fs.readFileSync('lessons_needing_urls.json', 'utf8'));
  const sections = {};
  lessons.forEach(l => {
    const key = l.course_title + '|||' + l.section_title;
    if (!sections[key]) sections[key] = { course: l.course_title, section: l.section_title, count: 0 };
    sections[key].count++;
  });

  const offset = parseInt(process.argv[2] || '0');
  const limit = parseInt(process.argv[3] || '10');
  const sectionKeys = Object.keys(sections);
  const batch = sectionKeys.slice(offset, offset + limit);

  console.log(`Processing ${batch.length} of ${sectionKeys.length} sections (offset=${offset})`);

  let found = 0, failed = 0;
  for (let i = 0; i < batch.length; i++) {
    const key = batch[i];
    if (progress.searchedKeys.includes(key)) {
      console.log(`[${i+1}] Skip (cached): ${sections[key].course} > ${sections[key].section}`);
      continue;
    }

    const sec = sections[key];
    const query = sec.course + ' ' + sec.section;
    console.log(`[${i+1}/${batch.length}] ${query}`);

    const videos = await searchYouTube(query);

    if (videos.length > 0) {
      progress.videos[key] = videos;
      found++;
      for (const v of videos.slice(0, 3)) {
        console.log(`    -> ${v.id}: ${v.title.substring(0, 70)}`);
      }
    } else {
      failed++;
      console.log(`    No results`);
    }

    progress.searchedKeys.push(key);
    fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
    await sleep(5000);
  }

  console.log(`\nDone: found=${found}, failed=${failed}, total cached=${progress.searchedKeys.length}/${sectionKeys.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
