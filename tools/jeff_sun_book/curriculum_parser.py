#!/usr/bin/env python3
"""
Curriculum Parser for Jeff Sun's Trading Guide
Source: https://jfsrev.substack.com/p/my-trading-tools-process-routine
Parses the Substack article into chapters, sections, paragraphs, list items, and tweet URLs.
"""

import json
import os
import re
import urllib.request
from bs4 import BeautifulSoup

SUBSTACK_URL = "https://jfsrev.substack.com/p/my-trading-tools-process-routine"
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
CURRICULUM_FILE = os.path.join(OUTPUT_DIR, "curriculum.json")
TWEET_IDS_FILE = os.path.join(OUTPUT_DIR, "tweet_ids.json")


def fetch_substack_html():
    print(f"Fetching Substack article from {SUBSTACK_URL}...")
    req = urllib.request.Request(
        SUBSTACK_URL,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            )
        },
    )
    with urllib.request.urlopen(req) as response:
        return response.read().decode("utf-8")


def parse_curriculum(html):
    soup = BeautifulSoup(html, "html.parser")
    body = (
        soup.find("div", class_="body")
        or soup.find("div", class_="available-content")
        or soup.find("article")
        or soup.find("div", id="main")
    )
    if not body:
        raise ValueError("Could not find article body in Substack HTML")

    chapters = []
    current_chapter = {
        "title": "Introduction & Background",
        "description": "",
        "sections": [],
    }
    current_section = {
        "title": "Overview",
        "elements": [],
    }

    tweet_url_pattern = re.compile(
        r"(?:twitter\.com|x\.com)/([A-Za-z0-9_]+)/status/(\d+)"
    )

    all_tweet_ids = set()

    for el in body.find_all(["h2", "h3", "h4", "p", "li", "blockquote"]):
        # If an <li> contains block elements (like <p>, <h4>, <div>), skip the outer <li>
        # so that each nested paragraph/heading is processed individually.
        if el.name == "li" and el.find(["p", "h3", "h4", "div"]):
            continue

        text = el.get_text(" ", strip=True)
        if not text:
            continue

        # Check for chapter title
        if el.name == "h2":
            if "Chapter" in text or "Glossary" in text or "Closing" in text:
                if current_section["elements"] or current_section["title"] != "Overview":
                    current_chapter["sections"].append(current_section)
                if current_chapter["sections"] or current_chapter["title"] != "Introduction & Background":
                    chapters.append(current_chapter)
                
                current_chapter = {
                    "title": text,
                    "description": "",
                    "sections": [],
                }
                current_section = {
                    "title": "Introduction",
                    "elements": [],
                }
                continue
            elif "This post is for paid subscribers" in text:
                break

        # Check for section header
        if el.name in ["h3", "h4"]:
            if current_section["elements"] or current_section["title"] != "Introduction":
                current_chapter["sections"].append(current_section)
            current_section = {
                "title": text,
                "elements": [],
            }
            continue

        # Extract tweets in this element
        tweets_in_el = []
        for a in el.find_all("a", href=True):
            href = a["href"]
            m = tweet_url_pattern.search(href)
            if m:
                handle = m.group(1)
                tid = m.group(2)
                anchor = a.get_text(strip=True)
                tweets_in_el.append({
                    "tweet_id": tid,
                    "handle": handle,
                    "url": href,
                    "anchor_text": anchor,
                })
                all_tweet_ids.add(tid)

        current_section["elements"].append({
            "tag": el.name,
            "text": text,
            "tweets": tweets_in_el,
        })

    # Append remaining
    if current_section["elements"]:
        current_chapter["sections"].append(current_section)
    if current_chapter["sections"]:
        chapters.append(current_chapter)

    return chapters, sorted(list(all_tweet_ids), key=lambda x: int(x))


def main():
    html = fetch_substack_html()
    chapters, tweet_ids = parse_curriculum(html)

    print(f"Parsed {len(chapters)} chapters.")
    print(f"Total unique tweet status IDs: {len(tweet_ids)}")

    with open(CURRICULUM_FILE, "w", encoding="utf-8") as f:
        json.dump(chapters, f, indent=2, ensure_ascii=False)
    print(f"Saved curriculum to {CURRICULUM_FILE}")

    with open(TWEET_IDS_FILE, "w", encoding="utf-8") as f:
        json.dump(tweet_ids, f, indent=2)
    print(f"Saved tweet IDs to {TWEET_IDS_FILE}")


if __name__ == "__main__":
    main()

