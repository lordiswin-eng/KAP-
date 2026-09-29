const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Token ve Chat ID bilgileri doğrudan eklendi
const TELEGRAM_TOKEN = '8924477452:AAEF38jB72TaUd41kbgsnV-r6RjkAaotcTM';
const CHAT_ID = '8911032066';

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// Render canlılık kontrolü (Health check)
app.get('/', (req, res) => {
  res.send('KAP Telegram Bot Servisi Aktif ve Çalışıyor 🚀');
});

// GitHub Webhook Endpoint
app.post('/webhook', (req, res) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;

  // 1. Olay: GitHub Release / Bildirim Yayınlandığında
  if (event === 'release' && payload.action === 'published') {
    const release = payload.release;
    const repoName = payload.repository.name;

    const message = 
`📢 *YENİ KAP BİLDİRİMİ*

🏢 *Kaynak/Proje:* ${repoName}
📌 *Başlık:* ${release.name || release.tag_name}
👤 *Yayınlayan:* ${release.author.login}

📝 *Açıklama:*
${release.body || 'İçerik belirtilmedi.'}

🔗 [Bildirimi Görüntüle](${release.html_url})`;

    bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' })
      .then(() => console.log('Telegram bildirimi başarıyla gönderildi.'))
      .catch((err) => console.error('Telegram gönderim hatası:', err));
  }

  // 2. Olay: GitHub Commit / Push Yapıldığında
  if (event === 'push') {
    const commits = payload.commits;
    if (commits && commits.length > 0) {
      const latestCommit = commits[0];
      const repoName = payload.repository.name;

      const message = 
`📢 *YENİ KAP BİLDİRİMİ (Push)*

🏢 *Kaynak:* ${repoName}
✍️ *Gönderen:* ${latestCommit.author.name}
💬 *Mesaj:* ${latestCommit.message}

🔗 [Detayları İncele](${latestCommit.url})`;

      bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' })
        .then(() => console.log('Push bildirimi gönderildi.'))
        .catch((err) => console.error('Telegram gönderim hatası:', err));
    }
  }

  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda başarıyla başlatıldı.`);
});
