#!/usr/bin/env python3
"""
Tweet and Media Crawler for Jeff Sun's Trading Syllabus
Fetches tweet texts, metadata, and high-resolution chart images using Twitter's syndication API.
"""

import argparse
import json
import os
import random
import sys
import time
from curl_cffi import requests

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
TWEET_IDS_FILE = os.path.join(OUTPUT_DIR, "tweet_ids.json")
CACHE_FILE = os.path.join(OUTPUT_DIR, "tweets_cache.json")
IMAGES_DIR = os.path.join(OUTPUT_DIR, "images")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
}


def load_cached_tweets():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Warning: Failed to load cache ({e}), starting fresh.")
    return {}


def save_cached_tweets(cache):
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)


def extract_full_text(data):
    # Check for long-form Note Tweet (X Premium / Twitter Articles)
    if "note_tweet" in data:
        nt = data["note_tweet"].get("note_tweet_results", {}).get("result", {})
        if "text" in nt and nt["text"]:
            return nt["text"]
    return data.get("text", "")


def download_image(url, save_path):
    if os.path.exists(save_path) and os.path.getsize(save_path) > 0:
        return True

    # Try original high-res first
    orig_url = url
    if "?" in url:
        orig_url = url.split("?")[0] + "?name=orig"
    elif not url.endswith(":orig"):
        orig_url = url + "?name=orig"

    for attempt_url in [orig_url, url]:
        try:
            r = requests.get(attempt_url, headers=HEADERS, impersonate="chrome120", timeout=15)
            if r.status_code == 200 and len(r.content) > 100:
                with open(save_path, "wb") as f:
                    f.write(r.content)
                return True
        except Exception:
            continue
    return False


def fetch_single_tweet(tweet_id):
    api_url = f"https://cdn.syndication.twimg.com/tweet-result?id={tweet_id}&token=1"
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            r = requests.get(api_url, headers=HEADERS, impersonate="chrome120", timeout=12)
            if r.status_code == 200:
                data = r.json()
                if not data or not isinstance(data, dict) or not data.get("id_str"):
                    # Tweet deleted, suspended, or private
                    return {"id": tweet_id, "status": "not_found", "error": "Empty or deleted tweet"}
                
                user = data.get("user", {})
                full_text = extract_full_text(data)

                # Process images
                photos = data.get("photos", [])
                downloaded_photos = []
                for idx, photo in enumerate(photos):
                    photo_url = photo.get("url")
                    if photo_url:
                        # determine extension
                        ext = ".jpg"
                        if ".png" in photo_url:
                            ext = ".png"
                        filename = f"{tweet_id}_{idx}{ext}"
                        local_path = os.path.join(IMAGES_DIR, filename)
                        rel_path = f"images/{filename}"
                        if download_image(photo_url, local_path):
                            downloaded_photos.append({
                                "original_url": photo_url,
                                "local_path": rel_path,
                                "width": photo.get("width"),
                                "height": photo.get("height"),
                            })

                # Process quoted tweet if any
                quoted = None
                if "quoted_tweet" in data and isinstance(data["quoted_tweet"], dict):
                    q_data = data["quoted_tweet"]
                    quoted = {
                        "id": q_data.get("id_str"),
                        "user_name": q_data.get("user", {}).get("name"),
                        "user_screen_name": q_data.get("user", {}).get("screen_name"),
                        "text": extract_full_text(q_data),
                    }

                # Process parent tweet if any
                parent = None
                if "parent" in data and isinstance(data["parent"], dict):
                    p_data = data["parent"]
                    parent = {
                        "id": p_data.get("id_str"),
                        "user_name": p_data.get("user", {}).get("name"),
                        "user_screen_name": p_data.get("user", {}).get("screen_name"),
                        "text": extract_full_text(p_data),
                    }

                return {
                    "id": tweet_id,
                    "status": "ok",
                    "user_name": user.get("name"),
                    "user_screen_name": user.get("screen_name"),
                    "created_at": data.get("created_at"),
                    "text": full_text,
                    "favorite_count": data.get("favorite_count", 0),
                    "photos": downloaded_photos,
                    "quoted_tweet": quoted,
                    "parent": parent,
                    "raw_url": f"https://x.com/{user.get('screen_name', 'i')}/status/{tweet_id}",
                }
            elif r.status_code == 404:
                return {"id": tweet_id, "status": "not_found", "error": "404 Not Found"}
            elif r.status_code == 429:
                wait_time = (attempt + 1) * 5
                print(f"Rate limited (429) on {tweet_id}. Sleeping {wait_time}s...")
                time.sleep(wait_time)
            else:
                print(f"Status {r.status_code} on {tweet_id}, retrying...")
                time.sleep(1)
        except Exception as e:
            if attempt == max_retries - 1:
                return {"id": tweet_id, "status": "error", "error": str(e)}
            time.sleep(1)

    return {"id": tweet_id, "status": "error", "error": "Max retries exceeded"}


def main():
    parser = argparse.ArgumentParser(description="Crawl tweets and images for Jeff Sun book")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of tweets to crawl")
    parser.add_argument("--force", action="store_true", help="Re-fetch already cached tweets")
    args = parser.parse_args()

    os.makedirs(IMAGES_DIR, exist_ok=True)

    if not os.path.exists(TWEET_IDS_FILE):
        print(f"Error: {TWEET_IDS_FILE} not found. Run curriculum_parser.py first.")
        sys.exit(1)

    with open(TWEET_IDS_FILE, "r") as f:
        tweet_ids = json.load(f)

    cache = load_cached_tweets()
    print(f"Total tweet IDs in syllabus: {len(tweet_ids)}")
    print(f"Already cached: {len(cache)}")

    to_crawl = [tid for tid in tweet_ids if args.force or tid not in cache or cache[tid].get("status") not in ["ok", "not_found"]]
    if args.limit:
        to_crawl = to_crawl[:args.limit]

    print(f"To fetch in this run: {len(to_crawl)}")

    success_count = 0
    not_found_count = 0
    error_count = 0

    try:
        for idx, tid in enumerate(to_crawl):
            res = fetch_single_tweet(tid)
            cache[tid] = res

            status = res.get("status")
            if status == "ok":
                success_count += 1
                img_count = len(res.get("photos", []))
                print(f"[{idx+1}/{len(to_crawl)}] Tweet {tid}: OK (@{res.get('user_screen_name')}, {img_count} imgs)")
            elif status == "not_found":
                not_found_count += 1
                print(f"[{idx+1}/{len(to_crawl)}] Tweet {tid}: Not Found / Deleted")
            else:
                error_count += 1
                print(f"[{idx+1}/{len(to_crawl)}] Tweet {tid}: Error ({res.get('error')})")

            # Save periodically
            if (idx + 1) % 10 == 0:
                save_cached_tweets(cache)

            # Jittered delay to be polite
            time.sleep(random.uniform(0.25, 0.55))

    except KeyboardInterrupt:
        print("\nInterrupted by user! Saving progress...")
    finally:
        save_cached_tweets(cache)
        print(f"\nFinished run. Success: {success_count}, Not Found: {not_found_count}, Error: {error_count}")
        print(f"Total cache size: {len(cache)}")


if __name__ == "__main__":
    main()

