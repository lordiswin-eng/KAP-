import os
import asyncio
import threading
import httpx
import feedparser
from flask import Flask
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

# ---------------------------------------------------------
# 1. Render Uyku Modunu Önleyici Web Sunucusu (Flask)
# ---------------------------------------------------------
app = Flask(__name__)

@app.route('/')
def home():
    return "KAP Telegram Botu Aktif ve Çalışıyor!", 200

def run_flask():
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)


# ---------------------------------------------------------
# 2. KAP Haber Çekme Servisi
# ---------------------------------------------------------
async def get_company_kap_news(ticker_symbol: str, limit: int = 5):
    """
    Belirtilen hisse koduna ait son KAP haberlerini RSS üzerinden çeker.
    """
    news_list = []
    symbol = ticker_symbol.upper()
    rss_url = "https://www.kap.org.tr/tr/rss"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(rss_url)

        if response.status_code == 200:
            feed = feedparser.parse(response.text)

            for entry in feed.entries:
                title = entry.get("title", "")
                summary = entry.get("summary", "")

                if symbol in title or symbol in summary:
                    news_list.append({
                        "title": title,
                        "link": entry.get("link", "#")
                    })

                if len(news_list) >= limit:
                    break
    except Exception as e:
        print(f"KAP haber çekme hatası: {e}")

    return news_list


# ---------------------------------------------------------
# 3. Telegram Komut Yakalayıcısı (/kap HISSE)
# ---------------------------------------------------------
async def kap_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text(
            "⚠️ Lütfen haberlerini görmek istediğiniz hisse kodunu girin.\n\n"
            "**Örnek:** `/kap THYAO`",
            parse_mode="Markdown"
        )
        return

    ticker = context.args[0].upper()
    await update.message.reply_text(f"⏳ **{ticker}** için son KAP haberleri getiriliyor...")

    kap_news = await get_company_kap_news(ticker, limit=5)

    if not kap_news:
        await update.message.reply_text(f"ℹ️ **{ticker}** için son yayınlanan KAP haberi bulunamadı.")
        return

    message = f"📢 **{ticker} SON KAP HABERLERİ**\n"
    message += "───────────────\n\n"

    for idx, news in enumerate(kap_news, start=1):
        message += f"{idx}. [{news['title']}]({news['link']})\n\n"

    await update.message.reply_text(
        message,
        parse_mode="Markdown",
        disable_web_page_preview=True
    )


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 Merhaba! KAP Haber Botuna Hoş Geldiniz.\n\n"
        "Herhangi bir hissenin son haberlerini görmek için:\n"
        "`/kap THYAO` veya `/kap EREGL` komutunu kullanabilirsiniz.",
        parse_mode="Markdown"
    )


# ---------------------------------------------------------
# 4. Bot Başlatıcı
# ---------------------------------------------------------
def main():
    # Telegram Bot Token'ı Render Environment Variable üzerinden alınır
    bot_token = os.environ.get("BOT_TOKEN")
    
    if not bot_token:
        print("HATA: BOT_TOKEN çevre değişkeni bulunamadı!")
        return

    # Flask sunucusunu ayrı bir thread üzerinde başlat
    threading.Thread(target=run_flask, daemon=True).start()

    # Telegram Bot Kurulumu
    application = ApplicationBuilder().token(bot_token).build()

    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("kap", kap_command))

    print("KAP Telegram Botu Render üzerinde başlatılıyor...")
    application.run_polling()


if __name__ == "__main__":
    main()
