const https = require('https');
const http = require('http');
const fs = require('fs');

function fetchJson(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 15000
    }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        fetchJson(res.headers.location).then(resolve);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const INVIDIOUS_INSTANCES = [
  'https://vid.puffyan.us',
  'https://invidious.snopyta.org',
  'https://yewtu.be',
  'https://inv.nadeko.net',
  'https://invidious.fdn.fr',
  'https://iv.ggtyler.dev',
  'https://invidious.privacyredirect.com',
  'https://inv.tux.pizza',
  'https://invidious.protokoll-11.de'
];

async function searchYouTube(query) {
  for (const instance of INVIDIOUS_INSTANCES) {
    const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance`;
    console.log(`  Trying ${instance}...`);
    const results = await fetchJson(url);
    if (results && Array.isArray(results) && results.length > 0) {
      return results.slice(0, 8).map(r => ({
        id: r.videoId,
        title: r.title || '',
        author: r.author || '',
        lengthSeconds: r.lengthSeconds || 0
      }));
    }
    await sleep(2000);
  }
  return [];
}

async function main() {
  const lessons = JSON.parse(fs.readFileSync('lessons_needing_urls.json', 'utf8'));

  const sections = {};
  lessons.forEach(l => {
    const key = l.course_title + '|||' + l.section_title;
    if (!sections[key]) sections[key] = { course: l.course_title, section: l.section_title, lessons: [] };
    sections[key].lessons.push(l);
  });

  let searchResults = {};
  if (fs.existsSync('search_results.json')) {
    searchResults = JSON.parse(fs.readFileSync('search_results.json', 'utf8'));
  }

  const sectionKeys = Object.keys(sections);
  console.log(`Total sections: ${sectionKeys.length}`);
  console.log(`Already searched: ${Object.keys(searchResults).filter(k => !k.startsWith('_')).length}`);

  const offset = parseInt(process.argv[2] || '0');
  const limit = parseInt(process.argv[3] || '5');
  const batch = sectionKeys.slice(offset, offset + limit);

  for (const key of batch) {
    const sec = sections[key];
    const course = sec.course;
    const section = sec.section;

    if (searchResults[course] && searchResults[course][section]) {
      console.log(`Skipping ${course} > ${section} (already have results)`);
      continue;
    }

    const query = course + ' ' + section + ' tutorial';
    console.log(`\nSearching: ${query}`);

    const videos = await searchYouTube(query);

    if (videos.length > 0) {
      if (!searchResults[course]) searchResults[course] = {};
      searchResults[course][section] = videos;
      console.log(`  Found ${videos.length} videos`);
      for (const v of videos) {
        console.log(`    - ${v.title} (${v.id})`);
      }
    } else {
      console.log(`  No results found`);
    }

    await sleep(3000);
  }

  fs.writeFileSync('search_results.json', JSON.stringify(searchResults, null, 2));
  console.log('\nResults saved.');
}

main().catch(e => { console.error(e); process.exit(1); });
