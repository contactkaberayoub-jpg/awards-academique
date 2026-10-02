const fs = require('fs');

let searchResults = {};
if (fs.existsSync('search_results.json')) {
  searchResults = JSON.parse(fs.readFileSync('search_results.json', 'utf8'));
}

function addResults(courseName, sectionName, videos) {
  if (!searchResults[courseName]) searchResults[courseName] = {};
  searchResults[courseName][sectionName] = videos;
  fs.writeFileSync('search_results.json', JSON.stringify(searchResults, null, 2));
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
  const { Client } = require('pg');
  const c = new Client({
    host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432, database: 'postgres',
    user: 'postgres.wquicdlbtbcsivyqdltx', password: 'kaberayuub7', ssl: { rejectUnauthorized: false }
  });
  await c.connect();

  const lessons = JSON.parse(fs.readFileSync('lessons_needing_urls.json', 'utf8'));

  let updated = 0, skipped = 0, noVideo = 0;

  for (const lesson of lessons) {
    const courseVideos = searchResults[lesson.course_title];
    if (!courseVideos) { noVideo++; continue; }

    let allVideos = [];
    for (const [secName, vids] of Object.entries(courseVideos)) {
      allVideos = allVideos.concat(vids);
    }

    let bestMatch = null;
    let bestScore = 0;

    for (const video of allVideos) {
      const score = scoreMatch(lesson.lesson_title, video.title);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = video;
      }
    }

    if (bestMatch && bestScore >= 0.3) {
      const videoUrl = 'https://www.youtube.com/watch?v=' + bestMatch.id;
      try {
        await c.query('UPDATE lessons SET video_url=$1, lesson_type=$2, updated_at=NOW() WHERE id=$3',
          [videoUrl, 'video', lesson.id]);
        updated++;
      } catch (e) {
        console.error('DB error:', e.message);
      }
    } else {
      skipped++;
    }
  }

  console.log(`Updated: ${updated}, Skipped (no match): ${skipped}, No video data: ${noVideo}`);
  await c.end();
}

if (process.argv[2] === 'apply') {
  main().catch(e => { console.error(e); process.exit(1); });
} else if (process.argv[2] === 'add') {
  const course = process.argv[3];
  const section = process.argv[4];
  const videosJson = process.argv[5];
  const videos = JSON.parse(videosJson);
  addResults(course, section, videos);
  console.log(`Added ${videos.length} videos for ${course} > ${section}`);
} else {
  console.log('Usage:');
  console.log('  node video_pipeline.js add "Course" "Section" \'[{"id":"xxx","title":"yyy"}]\'');
  console.log('  node video_pipeline.js apply');
}
