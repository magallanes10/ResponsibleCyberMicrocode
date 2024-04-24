const express = require('express');
const axios = require('axios');
const fs = require('fs');
const ytdl = require('ytdl-core');
const cheerio = require('cheerio');
const FormData = require('form-data');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

const getRandomIP = () => {
  const ip = Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.');
  return ip;
};

app.get('/upload', async (req, res) => {
  const ytlink = req.query.url;

  if (!ytlink) {
    return res.status(400).json({ error: 'YouTube URL is required 🔥' });
  }

  try {
    const info = await ytdl.getInfo(ytlink);
    const videoTitle = info.videoDetails.title;
    let fileName = `${videoTitle}.m4a`;

    fileName = cleanFileName(fileName);

    const videoStream = ytdl(ytlink, { filter: 'audioonly', quality: 'highestaudio', format: 'm4a' });
    videoStream.pipe(fs.createWriteStream(fileName));

    videoStream.on('end', async () => {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(fileName));

      const ip = getRandomIP();

      try {
        const uploadResponse = await axios.post('https://rgdpsmusic.ps.fhgdps.com/upload.php', formData, {
          headers: {
            ...formData.getHeaders(),
            'User-Agent': 'Opera/9.80 (Windows NT 6.0) Presto/2.12.388 Version/12.14', // Changed user-agent to simulate Opera browser
            'X-Forwarded-For': ip,  // Set random IP address
          },
          timeout: 30000
        });

        const $ = cheerio.load(uploadResponse.data);
        const downloadUrl = $('a').filter((i, el) => {
          const href = $(el).attr('href');
          return href && /https:\/\/rgdpsmusic.ps.fhgdps.com\/uploads\/.+\.m4a/.test(href);
        }).attr('href');

        if (downloadUrl) {
          console.log(`Uploaded from IP: ${ip}`);
          console.log(`Upload link: ${downloadUrl}`);
          console.log(`YouTube link: ${ytlink}`);
          console.log('Status: OK');
          res.json({ downloadUrl: downloadUrl });
          fs.unlinkSync(fileName);
        } else {
          console.log(`Uploaded from IP: ${ip}`);
          console.log(`YouTube link: ${ytlink}`);
          console.log('Status: Failed - Download URL not found');
          res.status(404).json({ error: 'Download URL not found' });
          fs.unlinkSync(fileName);
        }
      } catch (uploadError) {
        console.log(`Uploaded from IP: ${ip}`);
        console.log(`YouTube link: ${ytlink}`);
        console.log(`Status: Failed - ${uploadError.message}`);
        res.status(500).json({ error: 'Error processing request' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error processing request' });
  }
});

const cleanFileName = (fileName) => {
  return fileName.replace(/\s+/g, '_')
    .replace(/#/g, '')
    .replace(/[^a-zA-Z0-9_.-]/g, '');
};

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
