# Jeff Sun's Swing Trading Masterclass Book Compiler

This tool suite parses Jeff Sun's ([@jfsrev](https://x.com/jfsrev)) comprehensive Substack trading syllabus ([My Trading Tools, Process & Routine](https://jfsrev.substack.com/p/my-trading-tools-process-routine)), crawls all ~400 linked Twitter/X educational threads and high-resolution chart images, and compiles them into a structured trading book.

---

## Architecture

1. **`curriculum_parser.py`**:
   - Fetches the live Substack article.
   - Extracts 17 core chapters, subsections, and prose explanations.
   - Maps every topic to its specific Twitter/X status URLs.
   - Outputs: `curriculum.json` and `tweet_ids.json`.

2. **`tweet_crawler.py`**:
   - Crawls each tweet using Twitter's syndication endpoint via `curl_cffi` (no API key or login required).
   - Extracts full text (including long-form `note_tweet` posts).
   - Downloads original high-resolution chart images (`pbs.twimg.com/...:orig`) into `images/`.
   - Caches responses in `tweets_cache.json` (incremental and resumable).

3. **`book_builder.py`**:
   - Merges `curriculum.json` and `tweets_cache.json`.
   - Generates:
     - `The_Complete_Traders_Guide.md`: Consolidated master book with dynamic Table of Contents.
     - `chapters/*.md`: Clean, chapter-by-chapter Markdown files.
     - Embeds local high-resolution charts inline with descriptive captions.

4. **`synthesizer.py`** *(Optional)*:
   - Uses an LLM to turn raw tweet threads into flowing textbook prose while preserving all quantitative rules, formulas, and chart attachments.

---

## Usage

### 1. Parse Curriculum from Substack
```bash
./.venv/bin/python tools/jeff_sun_book/curriculum_parser.py
```

### 2. Crawl Tweets and Download Charts
```bash
# Test with first 10 tweets
./.venv/bin/python tools/jeff_sun_book/tweet_crawler.py --limit 10

# Full crawl of all ~395 tweets (takes ~2 minutes)
./.venv/bin/python tools/jeff_sun_book/tweet_crawler.py
```

### 3. Build Markdown Book
```bash
./.venv/bin/python tools/jeff_sun_book/book_builder.py
```

### 4. Export to PDF / EPUB / Obsidian
* **Obsidian**: Copy the entire `jeff_sun_book/` directory into your Obsidian vault.
* **PDF via Pandoc**:
  ```bash
  pandoc The_Complete_Traders_Guide.md -o The_Complete_Traders_Guide.pdf --pdf-engine=xelatex
  ```

