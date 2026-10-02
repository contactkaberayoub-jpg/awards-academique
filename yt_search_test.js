const https = require('https');
const http = require('http');

function searchYouTube(query) {
  return new Promise((resolve, reject) => {
    const url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query) + '&sp=EgIQAQ%3D%3D';
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          // Extract video IDs from the ytInitialData JSON
          const match = data.match(/var ytInitialData = ({.*?});<\/script>/s);
          if (!match) {
            // Try alternative pattern
            const match2 = data.match(/"videoRenderer":\s*\{\s*"videoId":\s*"([^"]+)"/);
            if (match2) {
              resolve({ id: match2[1], title: '' });
            } else {
              resolve(null);
            }
            return;
          }
          const ytData = JSON.parse(match[1]);
          const contents = ytData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
          if (!contents) { resolve(null); return; }
          for (const item of contents) {
            const vr = item.videoRenderer;
            if (vr) {
              resolve({ id: vr.videoId, title: vr.title?.runs?.[0]?.text || '' });
              return;
            }
          }
          resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
  });
}

// Test with a single query
async function main() {
  const result = await searchYouTube('Docker tutorial pour débutants');
  if (result) {
    console.log('Found:', result.id, result.title);
    console.log('URL: https://www.youtube.com/watch?v=' + result.id);
  } else {
    console.log('No result found');
  }
}

main();
