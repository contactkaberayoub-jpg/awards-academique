const https = require('https');

function searchYouTubeRaw(query) {
  return new Promise((resolve, reject) => {
    const url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query);
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Try multiple patterns
        const patterns = [
          /var ytInitialData = ({.*?});<\/script>/s,
          /ytInitialData\s*=\s*'({.*?})'/s,
          /window\["ytInitialData"\]\s*=\s*({.*?});/s
        ];
        
        let found = false;
        for (const p of patterns) {
          const m = data.match(p);
          if (m) {
            console.log('Pattern matched:', p.source.substring(0, 30));
            try {
              const parsed = JSON.parse(m[1]);
              // Navigate the structure
              const tabs = parsed?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
              if (tabs) {
                for (const tab of tabs) {
                  const items = tab?.itemSectionRenderer?.contents;
                  if (items) {
                    for (const item of items) {
                      if (item.videoRenderer) {
                        resolve({ id: item.videoRenderer.videoId, title: item.videoRenderer.title?.runs?.[0]?.text });
                        found = true;
                        return;
                      }
                    }
                  }
                }
              }
            } catch(e) { console.log('Parse error:', e.message.substring(0, 50)); }
          }
        }
        
        if (!found) {
          // Try to find video IDs via regex
          const videoIds = [...data.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)];
          if (videoIds.length > 0) {
            console.log('Fallback regex found', videoIds.length, 'video IDs');
            resolve({ id: videoIds[0][1], title: '(regex fallback)' });
          } else {
            console.log('No results. Page size:', data.length, 'Has ytInitialData:', data.includes('ytInitialData'));
            resolve(null);
          }
        }
      });
    });
    req.on('error', (e) => { console.log('Request error:', e.message); resolve(null); });
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
  });
}

async function main() {
  const queries = [
    'Docker tutorial débutants',
    'Créer un Dockerfile tutorial',
    'Python pandas tutorial',
    'Scikit-learn tutorial',
    'Kubernetes pods tutorial',
    'Node.js Express API tutorial',
    'Flutter tutorial débutants',
    'HTML CSS JavaScript débutants',
    'Machine Learning tutorial',
    'Deep Learning TensorFlow tutorial'
  ];
  
  for (const q of queries) {
    console.log('\n--- Query:', q, '---');
    const result = await searchYouTubeRaw(q);
    if (result) {
      console.log('Result:', result.id, result.title);
      console.log('URL: https://www.youtube.com/watch?v=' + result.id);
    } else {
      console.log('No result');
    }
    await new Promise(r => setTimeout(r, 1000));
  }
}

main();
