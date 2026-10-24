#!/usr/bin/env python3
"""
Book Builder for Jeff Sun's Trading Guide
Compiles curriculum.json and tweets_cache.json into clean, formatted Markdown books:
1. Single master book: The_Complete_Traders_Guide.md
2. Individual chapter files in chapters/ directory
"""

import json
import os
import re

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
CURRICULUM_FILE = os.path.join(OUTPUT_DIR, "curriculum.json")
CACHE_FILE = os.path.join(OUTPUT_DIR, "tweets_cache.json")
CHAPTERS_DIR = os.path.join(OUTPUT_DIR, "chapters")
MASTER_BOOK_FILE = os.path.join(OUTPUT_DIR, "The_Complete_Traders_Guide.md")


def sanitize_filename(name):
    clean = re.sub(r'[^\w\s-]', '', name).strip()
    return re.sub(r'[-\s]+', '_', clean)[:50]


def format_tweet_markdown(tweet_data, img_prefix=""):
    if not tweet_data or tweet_data.get("status") != "ok":
        return ""

    user_name = tweet_data.get("user_name", "Jeff Sun, CFTe")
    screen_name = tweet_data.get("user_screen_name", "jfsrev")
    raw_url = tweet_data.get("raw_url", f"https://x.com/{screen_name}/status/{tweet_data['id']}")
    created_at = tweet_data.get("created_at", "")
    date_str = created_at[:10] if created_at else ""
    favs = tweet_data.get("favorite_count", 0)

    text = tweet_data.get("text", "").strip()
    # Format text lines for blockquote
    formatted_lines = []
    for line in text.split("\n"):
        formatted_lines.append(f"> {line}" if line.strip() else ">")
    quote_body = "\n".join(formatted_lines)

    lines = []
    lines.append(f"> 💬 **{user_name}** ([@{screen_name}](https://x.com/{screen_name})) · *{date_str}*")
    lines.append(">")
    lines.append(quote_body)

    # Photos
    photos = tweet_data.get("photos", [])
    if photos:
        lines.append(">")
        for idx, p in enumerate(photos):
            p_path = p.get("local_path", "")
            if img_prefix and p_path.startswith("images/"):
                p_path = img_prefix + p_path
            lines.append(f"> ![{user_name} Chart {idx+1}]({p_path})")

    # Quoted tweet
    quoted = tweet_data.get("quoted_tweet")
    if quoted and quoted.get("text"):
        q_user = quoted.get("user_name", "Quoted Tweet")
        q_screen = quoted.get("user_screen_name", "")
        lines.append(">")
        lines.append(f"> > 🔁 **Quoted: {q_user}** (@{q_screen}):")
        for q_line in quoted.get("text", "").strip().split("\n"):
            lines.append(f"> > {q_line}" if q_line.strip() else "> >")

    lines.append(">")
    lines.append(f"> *[View Original Post on X]({raw_url}) · ❤️ {favs:,} likes*")
    lines.append("")

    return "\n".join(lines)


def build_book():
    if not os.path.exists(CURRICULUM_FILE):
        print(f"Error: {CURRICULUM_FILE} not found. Run curriculum_parser.py first.")
        return

    with open(CURRICULUM_FILE, "r", encoding="utf-8") as f:
        chapters = json.load(f)

    cache = {}
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            cache = json.load(f)

    os.makedirs(CHAPTERS_DIR, exist_ok=True)

    master_content = []
    # Title & Frontmatter
    master_content.append("# The Complete Trader's Guide: Process, Tools, Routine & Execution")
    master_content.append("")
    master_content.append("**Author:** Jeff Sun, CFTe ([@jfsrev](https://x.com/jfsrev))  ")
    master_content.append("**Source:** Substack Masterclass & Curated Trading Threads  ")
    master_content.append("**Compilation:** Automated Educational Archive  ")
    master_content.append("")
    master_content.append("---")
    master_content.append("")

    # Table of Contents
    master_content.append("## Table of Contents\n")
    for ch_idx, ch in enumerate(chapters, 1):
        ch_title = ch.get("title", f"Chapter {ch_idx}")
        anchor = re.sub(r'[^\w\s-]', '', ch_title.lower()).replace(' ', '-')
        master_content.append(f"{ch_idx}. [{ch_title}](#{anchor})")
        for sec in ch.get("sections", []):
            sec_title = sec.get("title", "")
            if sec_title and sec_title not in ["Overview", "Introduction"]:
                sec_anchor = re.sub(r'[^\w\s-]', '', sec_title.lower()).replace(' ', '-')
                master_content.append(f"   * [{sec_title}](#{sec_anchor})")
    master_content.append("\n---\n")

    # Render each chapter
    for ch_idx, ch in enumerate(chapters, 1):
        ch_title = ch.get("title", f"Chapter {ch_idx}")
        chapter_md = []
        master_ch_md = []

        chapter_md.append(f"# {ch_title}\n")
        master_ch_md.append(f"# {ch_title}\n")

        for sec in ch.get("sections", []):
            sec_title = sec.get("title", "")
            if sec_title and sec_title not in ["Overview", "Introduction"]:
                chapter_md.append(f"\n### {sec_title}\n")
                master_ch_md.append(f"\n### {sec_title}\n")

            for el in sec.get("elements", []):
                tag = el.get("tag")
                text = el.get("text", "")
                tweets = el.get("tweets", [])

                line_content = f"* {text}" if tag == "li" else (f"> {text}\n" if tag == "blockquote" else f"{text}\n")
                chapter_md.append(line_content)
                master_ch_md.append(line_content)

                # If there are tweets linked in this element, embed them
                for tw in tweets:
                    tid = tw.get("tweet_id")
                    if tid and tid in cache:
                        # For chapter subfolder, use ../images/
                        ch_tw_md = format_tweet_markdown(cache[tid], img_prefix="../")
                        if ch_tw_md:
                            chapter_md.append("\n" + ch_tw_md)
                        
                        # For master book in root directory, use images/
                        master_tw_md = format_tweet_markdown(cache[tid], img_prefix="")
                        if master_tw_md:
                            master_ch_md.append("\n" + master_tw_md)

        # Save individual chapter file
        ch_slug = f"{ch_idx:02d}_{sanitize_filename(ch_title)}"
        ch_filename = os.path.join(CHAPTERS_DIR, f"{ch_slug}.md")
        with open(ch_filename, "w", encoding="utf-8") as f:
            f.write("\n".join(chapter_md))

        master_content.append("\n".join(master_ch_md))
        master_content.append("\n---\n")

    # Save Master Book
    with open(MASTER_BOOK_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(master_content))

    print(f"Successfully compiled {len(chapters)} chapters!")
    print(f"Master Book saved to: {MASTER_BOOK_FILE}")
    print(f"Chapter files saved to: {CHAPTERS_DIR}/")


if __name__ == "__main__":
    build_book()

