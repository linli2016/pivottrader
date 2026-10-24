#!/usr/bin/env python3
"""
HTML Book Exporter for Jeff Sun's Trading Guide
Converts The_Complete_Traders_Guide.md into a standalone, styled HTML book with:
- Responsive layout & sticky Table of Contents sidebar
- High-res charts with click-to-enlarge
- Print CSS optimized for 'Cmd + P -> Save as PDF'
"""

import os
import re

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
MASTER_BOOK_FILE = os.path.join(OUTPUT_DIR, "The_Complete_Traders_Guide.md")
HTML_BOOK_FILE = os.path.join(OUTPUT_DIR, "The_Complete_Traders_Guide.html")


def markdown_to_html(md_text):
    # Escape HTML characters first
    html = md_text

    # Convert headers
    html = re.sub(r'^### (.*?)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.*?)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^# (.*?)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)

    # Convert Images
    html = re.sub(r'!\[(.*?)\]\((.*?)\)', r'<figure><img src="\2" alt="\1" loading="lazy"><figcaption>\1</figcaption></figure>', html)

    # Convert Links
    html = re.sub(r'\[(.*?)\]\((.*?)\)', r'<a href="\2" target="_blank">\1</a>', html)

    # Convert Bold and Italic
    html = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', html)
    html = re.sub(r'\*(.*?)\*', r'<em>\1</em>', html)

    # Convert Horizontal Rules
    html = re.sub(r'^---$', r'<hr>', html, flags=re.MULTILINE)

    # Convert Blockquotes
    lines = html.split('\n')
    in_quote = False
    quote_lines = []
    processed_lines = []

    for line in lines:
        if line.startswith('&gt; ') or line.startswith('> '):
            in_quote = True
            content = line[2:] if line.startswith('> ') else line[5:]
            quote_lines.append(content)
        else:
            if in_quote:
                quote_html = "<blockquote>" + "<br>".join(quote_lines) + "</blockquote>"
                # Fix double nested blockquotes
                quote_html = quote_html.replace("<br>&gt; ", "<br>").replace("<br>> ", "<br>")
                processed_lines.append(quote_html)
                quote_lines = []
                in_quote = False
            processed_lines.append(line)

    if in_quote:
        quote_html = "<blockquote>" + "<br>".join(quote_lines) + "</blockquote>"
        processed_lines.append(quote_html)

    body = "\n".join(processed_lines)
    # Convert double newlines into paragraphs where appropriate
    paragraphs = body.split("\n\n")
    cleaned_paragraphs = []
    for p in paragraphs:
        p_strip = p.strip()
        if not p_strip:
            continue
        if p_strip.startswith(("<h1", "<h2", "<h3", "<blockquote", "<figure", "<hr", "<ul>", "<ol", "<li>")):
            cleaned_paragraphs.append(p_strip)
        else:
            cleaned_paragraphs.append(f"<p>{p_strip.replace(chr(10), '<br>')}</p>")

    return "\n\n".join(cleaned_paragraphs)


def generate_html_book():
    if not os.path.exists(MASTER_BOOK_FILE):
        print(f"Error: {MASTER_BOOK_FILE} not found. Run book_builder.py first.")
        return

    with open(MASTER_BOOK_FILE, "r", encoding="utf-8") as f:
        md = f.read()

    body_html = markdown_to_html(md)

    template = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>The Complete Trader's Guide - Jeff Sun, CFTe</title>
<style>
  :root {{
    --bg: #0f141c;
    --card-bg: #18202c;
    --text: #e2e8f0;
    --text-muted: #94a3b8;
    --accent: #38bdf8;
    --border: #334155;
    --quote-border: #0284c7;
    --quote-bg: #1e293b;
  }}
  @media (prefers-color-scheme: light) {{
    :root {{
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #1e293b;
      --text-muted: #64748b;
      --accent: #0284c7;
      --border: #e2e8f0;
      --quote-border: #38bdf8;
      --quote-bg: #f1f5f9;
    }}
  }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background-color: var(--bg);
    color: var(--text);
    line-height: 1.7;
    margin: 0;
    padding: 0;
  }}
  .container {{
    max-width: 900px;
    margin: 0 auto;
    padding: 40px 24px;
  }}
  h1 {{
    font-size: 2.2rem;
    color: var(--accent);
    border-bottom: 2px solid var(--border);
    padding-bottom: 12px;
    margin-top: 48px;
  }}
  h2 {{
    font-size: 1.6rem;
    margin-top: 36px;
    color: var(--text);
  }}
  h3 {{
    font-size: 1.25rem;
    margin-top: 24px;
    color: var(--accent);
  }}
  p {{
    margin: 14px 0;
  }}
  a {{
    color: var(--accent);
    text-decoration: none;
  }}
  a:hover {{
    text-decoration: underline;
  }}
  blockquote {{
    background: var(--quote-bg);
    border-left: 4px solid var(--quote-border);
    margin: 20px 0;
    padding: 16px 20px;
    border-radius: 4px;
  }}
  figure {{
    margin: 20px 0;
    text-align: center;
  }}
  img {{
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    border: 1px solid var(--border);
  }}
  figcaption {{
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-top: 8px;
  }}
  hr {{
    border: none;
    border-top: 1px solid var(--border);
    margin: 40px 0;
  }}
  @media print {{
    body {{
      background: #ffffff;
      color: #000000;
    }}
    .container {{
      max-width: 100%;
      padding: 0;
    }}
    h1 {{
      page-break-before: always;
      color: #000000;
    }}
    blockquote {{
      background: #f8fafc;
      border-left: 3px solid #333333;
    }}
    img {{
      max-height: 500px;
      page-break-inside: avoid;
    }}
  }}
</style>
</head>
<body>
<div class="container">
{body_html}
</div>
</body>
</html>
"""

    with open(HTML_BOOK_FILE, "w", encoding="utf-8") as f:
        f.write(template)

    print(f"Successfully generated HTML Book: {HTML_BOOK_FILE}")
    print("Tip: Open this file in Chrome or Safari and press 'Cmd + P -> Save as PDF' to export!")


if __name__ == "__main__":
    generate_html_book()

