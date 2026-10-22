import re
import json
import hashlib
import asyncio
import aiohttp
from urllib.parse import urlparse
import sys


BASE_API = "https://m10.iyf.tv"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)
DEFAULT_HEADERS = {
    "User-Agent": USER_AGENT,
    "Referer": "https://www.iyf.tv/",
    "Origin": "https://www.iyf.tv",
}

# Delay between API calls to avoid rate limiting (seconds)
REQUEST_DELAY = 1.0
MAX_RETRIES = 5
RETRY_BACKOFF = 3.0  # seconds to wait on rate limit, doubles each retry


async def fetch_html(session, url):
    """Fetch HTML content from a URL."""
    async with session.get(url, headers=DEFAULT_HEADERS) as resp:
        assert resp.status == 200, f"HTTP {resp.status} for {url}"
        return await resp.text()


async def fetch_json_with_retry(session, url):
    """Fetch JSON with retry on rate limiting."""
    for attempt in range(MAX_RETRIES):
        async with session.get(url, headers=DEFAULT_HEADERS) as resp:
            assert resp.status == 200, f"HTTP {resp.status} for {url}"
            data = await resp.json()

        # Check for rate limit error (code 5 = "访问过量")
        if (isinstance(data.get('data'), dict)
                and data['data'].get('code') == 5):
            wait = RETRY_BACKOFF * (2 ** attempt)
            print(f"  Rate limited, waiting {wait:.0f}s ... (attempt {attempt + 1}/{MAX_RETRIES})",
                  file=sys.stderr)
            await asyncio.sleep(wait)
            continue

        return data

    # Return last response even if still rate-limited
    return data


def extract_config(html):
    """Extract publicKey and privateKey from injectJson in page HTML."""
    match = re.search(r'injectJson\s*=\s*(\{.*?\});', html)
    if not match:
        raise ValueError("Could not find injectJson in page HTML")

    config = json.loads(match.group(1))
    p_config = config['config'][0]['pConfig']
    return p_config['publicKey'], p_config['privateKey'][0]


def compute_vv(query_string, pub_key, priv_key):
    """
    Compute vv signature: MD5(pub_key + "&" + query.lower() + "&" + priv_key)
    """
    raw = f"{pub_key}&{query_string.lower()}&{priv_key}"
    return hashlib.md5(raw.encode('utf-8')).hexdigest()


def build_signed_url(endpoint, query_str, pub_key, priv_key):
    """Build a signed API URL. query_str should NOT be URL-encoded for commas etc."""
    full_query = f"{query_str}&pub={pub_key}"
    vv = compute_vv(full_query, pub_key, priv_key)
    return f"{BASE_API}{endpoint}?{full_query}&vv={vv}"





async def get_episodes(session, show_id, pub_key, priv_key):
    """Fetch episode list via the languagesplaylist API."""
    query = f"cinema=1&vid={show_id}&lsk=1&taxis=0&cid=0,1,4,152"
    url = build_signed_url('/v3/video/languagesplaylist', query, pub_key, priv_key)
    data = await fetch_json_with_retry(session, url)

    episodes = []
    if 'data' in data:
        info = data['data']
        items = info.get('info', []) if isinstance(info, dict) else info
        for item in items:
            play_list = item.get('playList', [])
            for ep in play_list:
                episodes.append({
                    'key': ep.get('key', ''),
                    'name': ep.get('name', ''),
                })
    return episodes


async def get_m3u8(session, episode_key, pub_key, priv_key):
    """Fetch the m3u8 URL for a single episode via the play API."""
    query = f"cinema=1&id={episode_key}&a=0&lang=none&usersign=1&region=CA&device=1&isMasterSupport=1"
    url = build_signed_url('/v3/video/play', query, pub_key, priv_key)
    data = await fetch_json_with_retry(session, url)

    try:
        info = data['data']['info']
        if info:
            flv_list = info[0].get('flvPathList', [])
            # Prefer HLS (m3u8) URL over mp4
            for flv in flv_list:
                if flv.get('isHls'):
                    return flv.get('result', '')
            # Fallback to first available URL
            if flv_list:
                return flv_list[0].get('result', '')
    except (KeyError, IndexError):
        pass

    return None


async def iyf(url):
    """Extract all m3u8 URLs from an iyf.tv show page."""
    parsed = urlparse(url)
    path_parts = parsed.path.strip('/').split('/')
    if len(path_parts) < 2 or path_parts[0] != 'play':
        print("Invalid URL. Expected: https://www.iyf.tv/play/SHOW_ID", file=sys.stderr)
        return

    show_id = path_parts[1]

    async with aiohttp.ClientSession() as session:
        # 1. Fetch page to get crypto keys
        html = await fetch_html(session, f"https://www.iyf.tv/play/{show_id}")
        pub_key, priv_key = extract_config(html)

        # 2. Get episode list
        episodes = await get_episodes(session, show_id, pub_key, priv_key)
        if not episodes:
            print("No episodes found.", file=sys.stderr)
            return

        print(f"Found {len(episodes)} episodes", file=sys.stderr)

        # 3. Get m3u8 for each episode with delay to avoid rate limiting
        urls = []
        for i, ep in enumerate(episodes):
            if i > 0:
                await asyncio.sleep(REQUEST_DELAY)

            print(f"  [{i + 1}/{len(episodes)}] Episode {ep['name']} ...", file=sys.stderr)
            m3u8_url = await get_m3u8(session, ep['key'], pub_key, priv_key)
            if m3u8_url:
                print(m3u8_url)
                urls.append(m3u8_url)
            else:
                print(f"# Failed: episode {ep['name']} (key={ep['key']})")

        # Write .m3u playlist with Referer header so players (VLC/IINA/mpv) work
        # The CDN requires Referer: https://www.iyf.tv/ — without it requests get 403
        m3u_path = f"./Videos/{show_id}.m3u"
        with open(m3u_path, "w", encoding="utf-8") as f:
            f.write("#EXTM3U\n")
            for url in urls:
                f.write("#EXTINF:-1\n")
                f.write("#EXTVLCOPT:http-referrer=https://www.iyf.tv/\n")
                f.write("#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36\n")
                f.write(url + "\n")
        print(f"Saved {len(urls)} URLs to {m3u_path}", file=sys.stderr)


if __name__ == "__main__":
    # if len(sys.argv) < 2:
    #     print("Usage: python3 iyf.py <url>")
    #     print("Example: python3 iyf.py https://www.iyf.tv/play/E4si52uysIH")
    #     sys.exit(1)
    # asyncio.run(iyf(sys.argv[1]))

    url = "https://www.yfsp.tv/play/ZJKnyszyp2j1"

    asyncio.run(iyf(url))
