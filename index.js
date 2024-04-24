const express = require('express');
const axios = require('axios');
const fs = require('fs');
const ytdl = require('ytdl-core');
const cheerio = require('cheerio');
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/upload', async (req, res) => {
  const ytlink = req.query.url; 

  if (!ytlink) {
    return res.status(400).json({ error: 'YouTube URL is required 🔥' });
  }

  try {
    const info = await ytdl.getInfo(ytlink);
    const videoTitle = info.videoDetails.title;
    let fileName = `${videoTitle}.mp3`;

    fileName = cleanFileName(fileName);

    const videoStream = ytdl(ytlink, { filter: 'audioonly', quality: 'highestaudio' });
    videoStream.pipe(fs.createWriteStream(fileName));

    videoStream.on('end', async () => {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(fileName));

      const uploadResponse = await axios.post('https://rgdpsmusic.ps.fhgdps.com/upload.php', formData, {
        headers: {
          ...formData.getHeaders(),
          'User-Agent': 'Mozilla/5.0'
        }
      });

      const $ = cheerio.load(uploadResponse.data);
      const downloadUrl = $('a').filter((i, el) => {
        const href = $(el).attr('href');
        return href && /https:\/\/rgdpsmusic.ps.fhgdps.com\/uploads\/.+\.mp3/.test(href);
      }).attr('href');

      if (downloadUrl) {
        res.json({ downloadUrl: downloadUrl });
        fs.unlinkSync(fileName); 
      } else {
        res.status(404).json({ error: 'Download URL not found' });
        fs.unlinkSync(fileName); 
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
