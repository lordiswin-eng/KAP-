const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// Render health-check veya ana sayfa kontrolü
app.get('/', (req, res) => {
  res.send('KAP Telegram Bot Servisi Çalışıyor 🚀');
});

// GitHub Webhook Endpoint
app.post('/webhook', (req, res) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;

  // Örnek 1: GitHub Release / Bildirim Yayınlandığında
  if (event === 'release' && payload.action === 'published') {
    const release = payload.release;
    const repoName = payload.repository.name;

    const message = 
`📢 *YENİ KAP BİLDİRİMİ / DUYURU*

🏢 *Şirket/Proje:* ${repoName}
📌 *Başlık:* ${release.name || release.tag_name}
👤 *Yayınlayan:* ${release.author.login}

📝 *Özet:*
${release.body || 'İçerik girilmedi.'}

🔗 [Bildirim Detayını İncele](${release.html_url})`;

    bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' })
      .then(() => console.log('Telegram bildirimi gönderildi.'))
      .catch((err) => console.error('Telegram hatası:', err));
  }

  // Örnek 2: GitHub Commit / Push Olayında
  if (event === 'push') {
    const commits = payload.commits;
    if (commits && commits.length > 0) {
      const latestCommit = commits[0];
      const repoName = payload.repository.name;

      const message = 
`📢 *YENİ KAP BİLDİRİMİ (Push)*

🏢 *Kaynak:* ${repoName}
✍️ *Yazar:* ${latestCommit.author.name}
💬 *Mesaj:* ${latestCommit.message}

🔗 [Commit Detayı](${latestCommit.url})`;

      bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
    }
  }

  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda dinleniyor.`);
});
