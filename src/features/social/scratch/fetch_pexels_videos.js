const axios = require('axios');
const fs = require('fs');

/**
 * Script to fetch video data from Pexels API for mockup testing.
 * You need a PEXELS_API_KEY to run this.
 * Get one for free at https://www.pexels.com/api/new/
 */

const PEXELS_API_KEY = '6k4RhjZlHQtQVxw5MSuuviTxqhKUVH3MX4ZyUfngXi7QbL3gegQJmRVx'; // Replace with your key
const QUERY = 'nature'; // nature, city, people, technology, etc.
const PER_PAGE = 20;

async function fetchPexelsVideos() {
  if (PEXELS_API_KEY === 'YOUR_PEXELS_API_KEY_HERE') {
    console.error('Please provide your Pexels API Key in the script.');
    return;
  }

  try {
    console.log(`Fetching ${PER_PAGE} videos for query: "${QUERY}"...`);

    const response = await axios.get(`https://api.pexels.com/videos/search?query=${QUERY}&per_page=${PER_PAGE}&orientation=portrait`, {
      headers: {
        Authorization: PEXELS_API_KEY
      }
    });

    const videos = response.data.videos;

    const exploreItems = videos.map((v, index) => {
      // Find the best video file (usually the one with highest resolution or specific link)
      const videoFile = v.video_files.find(f => f.quality === 'sd' || f.quality === 'hd') || v.video_files[0];

      return {
        id: `pex-${v.id}`,
        type: 'VIDEO',
        url: videoFile.link,
        thumbnail: v.image,
        likes: `${(Math.random() * 50 + 1).toFixed(1)}K`,
        comments: Math.floor(Math.random() * 500 + 50).toString(),
        author: {
          id: `u-${v.user.id}`,
          name: v.user.name.toLowerCase().replace(/\s+/g, '.'),
          avatar: `https://i.pravatar.cc/150?u=${v.user.id}`
        },
        caption: `Amazing ${QUERY} captured by ${v.user.name} #nature #explore #viral`
      };
    });

    const outputPath = 'g:/Workspace/Study/HK2_2025-2026/CNM/Project/CNM_Web/public/mock/explore_data.json';
    fs.writeFileSync(outputPath, JSON.stringify(exploreItems, null, 2));

    console.log('✅ Success!');
    console.log(`Data saved to: ${outputPath}`);
    console.log('\n--- PREVIEW OF FIRST ITEM ---');
    console.log(JSON.stringify(exploreItems[0], null, 2));

  } catch (error) {
    console.error('❌ Error fetching from Pexels:', error.response?.data || error.message);
  }
}

fetchPexelsVideos();
