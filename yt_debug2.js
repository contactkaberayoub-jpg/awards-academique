const https = require('https');

function searchYouTube(query) {
  return new Promise((resolve) => {
    const url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query) + '&sp=EgIQAQ%3D%3D';
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
        'Cookie': 'CONSENT=PENDING+987; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjMwODI5LjA3X3AxGgJlbiACGgYIgJnsBhAB'
      }
    };
    const req = https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const match = data.match(/var ytInitialData = ({.*?});<\/script>/s);
          if (!match) {
            // Fallback: regex for videoId
            const vidMatch = data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
            if (vidMatch && vidMatch.length > 0) {
              const id = vidMatch[0].match(/"videoId":"([a-zA-Z0-9_-]{11})"/)[1];
              resolve({ id, title: '' });
            } else {
              resolve(null);
            }
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
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
  });
}

// Test with delays
async function main() {
  const queries = [
    'Node.js Express tutorial',
    'Flutter tutorial débutants',
    'HTML CSS JavaScript débutants',
    'Machine Learning scikit-learn',
    'Deep Learning TensorFlow',
    'Docker Compose tutorial',
    'Kubernetes deployment tutorial',
    'React Spring Boot tutorial',
    'Ethical Hacking tutorial',
    'SEO Marketing Digital tutorial'
  ];
  for (const q of queries) {
    const r = await searchYouTube(q);
    console.log(q.substring(0,40).padEnd(42), '->', r ? r.id + ' ' + r.title.substring(0,40) : 'NULL');
    await new Promise(r => setTimeout(r, 2000));
  }
}
main();
