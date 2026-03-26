#!/usr/bin/env python3
"""
daily-ai-news.py — Busca as 5 principais notícias de IA e envia para Renato via Telegram.
Crontab: 0 7 * * * /usr/bin/python3 /Users/renatobreia/.openclaw/scripts/daily-ai-news.py
"""

import json
import re
import ssl
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from html import unescape
from urllib.parse import quote

# ── Config ──────────────────────────────────────────────────────────────────
BOT_TOKEN = "8478596151:AAGLoQUYYXrppaVC0fa6MwsssO6qo6EryiE"
CHAT_ID = "-1003708693538"
MESSAGE_THREAD_ID = 239

# RSS feeds to check
FEEDS = [
    ("TechCrunch AI", "https://techcrunch.com/category/artificial-intelligence/feed/"),
    ("The Verge AI", "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml"),
    ("VentureBeat AI", "https://venturebeat.com/category/ai/feed/"),
    ("Ars Technica", "https://feeds.arstechnica.com/arstechnica/technology-lab"),
    ("Google News AI", "https://news.google.com/rss/search?q=artificial+intelligence+when:1d&hl=en&gl=US&ceid=US:en"),
    ("Google News ChatGPT", "https://news.google.com/rss/search?q=ChatGPT+OR+OpenAI+OR+Claude+OR+Anthropic+OR+Gemini+OR+Google+AI+when:1d&hl=en&gl=US&ceid=US:en"),
]

# Keywords that boost relevance score
HIGH_KEYWORDS = [
    "chatgpt", "openai", "claude", "anthropic", "gemini", "google ai",
    "gpt-4", "gpt-5", "gpt4", "gpt5", "opus", "sonnet", "haiku",
    "o1", "o3", "o4", "sora", "dall-e", "midjourney",
    "llm", "large language model", "foundation model",
]
MEDIUM_KEYWORDS = [
    "artificial intelligence", "machine learning", "deep learning",
    "ai model", "ai agent", "ai assistant", "copilot", "neural",
    "transformer", "diffusion", "multimodal", "reasoning",
    "meta ai", "llama", "mistral", "perplexity", "deepseek",
    "apple intelligence", "microsoft ai", "amazon ai",
]

LOG_FILE = "/Users/renatobreia/.openclaw/logs/daily-ai-news.log"

# ── Helpers ─────────────────────────────────────────────────────────────────

def shorten_url(url, timeout=5):
    """Shorten a URL using TinyURL. Returns original URL on failure."""
    try:
        api = f"https://tinyurl.com/api-create.php?url={quote(url, safe='')}"
        req = urllib.request.Request(api, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            short = resp.read().decode("utf-8").strip()
            if short.startswith("http"):
                return short
    except Exception:
        pass
    return url


def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_FILE, "a") as f:
        f.write(f"--- {ts} ---\n{msg}\n")

def fetch_feed(name, url, timeout=15):
    """Fetch and parse a single RSS feed. Returns list of article dicts."""
    articles = []
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh)"})
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            data = resp.read().decode("utf-8", errors="replace")
        root = ET.fromstring(data)

        # Handle both RSS 2.0 (<item>) and Atom (<entry>) formats
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        items = root.findall(".//item") or root.findall(".//atom:entry", ns)

        for item in items:
            # RSS 2.0
            title = item.findtext("title", "")
            desc = item.findtext("description", "")
            link = item.findtext("link", "")
            pub_date = item.findtext("pubDate", "")
            # Atom fallback
            if not title:
                title = item.findtext("atom:title", "", ns)
            if not link:
                link_el = item.find("atom:link", ns)
                if link_el is not None:
                    link = link_el.get("href", "")
            if not pub_date:
                pub_date = item.findtext("atom:published", "", ns) or item.findtext("atom:updated", "", ns)

            # Clean HTML from title and description
            title = unescape(re.sub(r"<[^>]+>", "", title)).strip()
            desc = unescape(re.sub(r"<[^>]+>", "", desc)).strip()[:300]

            if title:
                articles.append({
                    "title": title,
                    "desc": desc,
                    "link": link,
                    "source": name,
                    "pub_date": pub_date,
                })
    except Exception as e:
        log(f"[WARN] Feed '{name}' failed: {e}")
    return articles


def score_article(article):
    """Score an article by AI relevance."""
    text = (article["title"] + " " + article["desc"]).lower()
    score = 0
    for kw in HIGH_KEYWORDS:
        if kw in text:
            score += 3
    for kw in MEDIUM_KEYWORDS:
        if kw in text:
            score += 1
    # Boost if title directly mentions key products/companies
    title_lower = article["title"].lower()
    for kw in HIGH_KEYWORDS[:10]:
        if kw in title_lower:
            score += 2
    return score


def deduplicate(articles):
    """Remove articles with very similar titles."""
    seen = []
    unique = []
    for art in articles:
        title_words = set(art["title"].lower().split())
        is_dup = False
        for seen_words in seen:
            overlap = len(title_words & seen_words) / max(len(title_words | seen_words), 1)
            if overlap > 0.6:
                is_dup = True
                break
        if not is_dup:
            seen.append(title_words)
            unique.append(art)
    return unique


def format_message(articles):
    """Format top 5 articles into a Telegram message."""
    now = datetime.now(timezone(timedelta(hours=-3)))
    date_str = now.strftime("%d/%m/%Y")

    msg = f"🤖 Top 5 Notícias de IA — {date_str}\n\n"

    for i, art in enumerate(articles[:5], 1):
        emoji = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"][i - 1]
        msg += f"{emoji} {art['title']}\n"
        if art["desc"]:
            # Keep description short
            short_desc = art["desc"][:150]
            if len(art["desc"]) > 150:
                short_desc += "..."
            msg += f"   {short_desc}\n"
        if art["link"]:
            msg += f"   🔗 {shorten_url(art['link'])}\n"
        msg += "\n"

    msg += "💡 Dica: responda com o número da notícia para saber mais detalhes."
    return msg


def send_telegram(text):
    """Send message via Telegram Bot API."""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = json.dumps({
        "chat_id": CHAT_ID,
        "text": text,
        "message_thread_id": MESSAGE_THREAD_ID,
        "disable_web_page_preview": True,
    }).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        result = json.loads(resp.read())
    return result.get("ok", False)


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    log("Iniciando busca de notícias de IA...")

    # 1. Fetch all feeds
    all_articles = []
    for name, url in FEEDS:
        arts = fetch_feed(name, url)
        all_articles.extend(arts)
        log(f"  {name}: {len(arts)} artigos")

    if not all_articles:
        msg = "🤖 Bom dia, Renato!\n\nNão consegui buscar notícias de IA hoje — os feeds estavam indisponíveis. Vou tentar novamente amanhã."
        send_telegram(msg)
        log("Nenhum artigo encontrado. Mensagem de fallback enviada.")
        return

    # 2. Score and rank
    for art in all_articles:
        art["score"] = score_article(art)

    all_articles.sort(key=lambda a: a["score"], reverse=True)

    # 3. Deduplicate
    unique = deduplicate(all_articles)
    log(f"  Total: {len(all_articles)} artigos, {len(unique)} únicos")

    # 4. Format and send
    msg = format_message(unique)
    ok = send_telegram(msg)

    if ok:
        log("Notícias enviadas com sucesso!")
    else:
        log("ERRO ao enviar notícias via Telegram")
        sys.exit(1)


if __name__ == "__main__":
    main()
