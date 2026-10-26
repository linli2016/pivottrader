#!/usr/bin/env python3
import warnings
# Suppress urllib3 LibreSSL warnings on macOS Python 3.9
warnings.filterwarnings("ignore", message=".*urllib3 v2 only supports OpenSSL.*")

import os
import sys
import shutil
import subprocess
import argparse

try:
    import yt_dlp
except ImportError:
    yt_dlp = None

try:
    import imageio_ffmpeg
except ImportError:
    imageio_ffmpeg = None


def find_ytdlp_cli():
    """Find the best standalone yt-dlp CLI binary on the system."""
    candidates = [
        "/opt/homebrew/bin/yt-dlp",
        "/usr/local/bin/yt-dlp",
        shutil.which("yt-dlp"),
    ]
    seen = set()
    best_bin = None
    best_ver = ""

    for c in candidates:
        if c and os.path.isfile(c) and os.access(c, os.X_OK):
            real_path = os.path.realpath(c)
            if real_path in seen:
                continue
            seen.add(real_path)
            try:
                res = subprocess.run([c, "--version"], capture_output=True, text=True, check=True)
                ver = res.stdout.strip().splitlines()[-1]
                if ver > best_ver:
                    best_ver = ver
                    best_bin = c
            except Exception:
                continue
    return best_bin, best_ver


def download_with_cli(ytdlp_bin, url, output_path="downloads", audio_only=False, cookies_browser=None, cookies_file=None):
    os.makedirs(output_path, exist_ok=True)
    out_tmpl = os.path.join(output_path, "%(title)s.%(ext)s")

    cmd = [ytdlp_bin]
    if audio_only:
        cmd.extend([
            "-f", "bestaudio/best",
            "-x",
            "--audio-format", "mp3",
            "--audio-quality", "192K",
            "-o", out_tmpl
        ])
    else:
        cmd.extend([
            "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best",
            "--merge-output-format", "mp4",
            "-o", out_tmpl
        ])

    if cookies_browser:
        cmd.extend(["--cookies-from-browser", cookies_browser])
    if cookies_file:
        cmd.extend(["--cookies", cookies_file])

    cmd.append(url)
    res = subprocess.run(cmd)
    return res.returncode == 0


def download_with_module(url, output_path="downloads", audio_only=False, cookies_browser=None, cookies_file=None, use_oauth=False):
    os.makedirs(output_path, exist_ok=True)

    if audio_only:
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(output_path, '%(title)s.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
        }
    else:
        ydl_opts = {
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best',
            'merge_output_format': 'mp4',
            'outtmpl': os.path.join(output_path, '%(title)s.%(ext)s'),
        }

    # Configure fallback player clients for YouTube
    ydl_opts['extractor_args'] = {
        'youtube': {
            'player_client': ['android_vr', 'web']
        }
    }
    ydl_opts['ignoreerrors'] = 'only_download'

    if cookies_browser:
        ydl_opts['cookiesfrombrowser'] = (cookies_browser,)
    if cookies_file:
        ydl_opts['cookiefile'] = cookies_file

    if use_oauth:
        print("Warning: OAuth2 login is no longer supported by YouTube / yt-dlp.")

    ffmpeg_exe = (
        shutil.which('ffmpeg')
        or ('/opt/homebrew/bin/ffmpeg' if os.path.exists('/opt/homebrew/bin/ffmpeg') else None)
        or ('/usr/local/bin/ffmpeg' if os.path.exists('/usr/local/bin/ffmpeg') else None)
        or (imageio_ffmpeg.get_ffmpeg_exe() if imageio_ffmpeg else None)
    )
    if ffmpeg_exe:
        ydl_opts['ffmpeg_location'] = ffmpeg_exe

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            ret = ydl.download([url])
            return ret == 0
        except Exception as e:
            print(f"Error: {str(e)}")
            return False


def download_youtube_video(url, output_path="downloads", audio_only=False, cookies_browser=None, cookies_file=None, use_oauth=False):
    cli_bin, cli_ver = find_ytdlp_cli()
    module_ver = getattr(yt_dlp, "__version__", "") if yt_dlp else ""

    # Prefer CLI binary if available and either Python is outdated (<3.10) or CLI version is newer
    use_cli = False
    if cli_bin:
        if sys.version_info < (3, 10) or cli_ver > module_ver or not yt_dlp:
            use_cli = True

    if use_cli:
        success = download_with_cli(
            cli_bin, url,
            output_path=output_path,
            audio_only=audio_only,
            cookies_browser=cookies_browser,
            cookies_file=cookies_file
        )
    elif yt_dlp:
        success = download_with_module(
            url,
            output_path=output_path,
            audio_only=audio_only,
            cookies_browser=cookies_browser,
            cookies_file=cookies_file,
            use_oauth=use_oauth
        )
    else:
        print("Error: Neither yt-dlp CLI nor python yt_dlp package is available.")
        return False

    if success:
        print(f"Download completed for {url}")
    else:
        print(f"Download failed for {url}")
    return success


def main():
    parser = argparse.ArgumentParser(description="Download YouTube videos or audio.")
    parser.add_argument("urls", nargs='*', help="YouTube URLs to download")
    parser.add_argument("--audio", action="store_true", help="Download audio only")
    parser.add_argument("-o", "--output", default="downloads", help="Output directory path (default: downloads)")
    parser.add_argument("--cookies-from-browser", help="Browser to load cookies from (e.g. chrome, firefox, safari)")
    parser.add_argument("--cookies", help="Path to cookies file (e.g. cookies.txt)")
    parser.add_argument("--oauth", action="store_true", help="Use OAuth2 login (deprecated)")
    args = parser.parse_args()

    urls = args.urls
    if not urls:
        # Fallback to hardcoded list if no args provided (preserving original behavior for manual run without args)
        urls = [
            "https://www.youtube.com/watch?v=-Qr4LJcup84"
        ]

    # Download each video
    for url in urls:
        if url:
            download_youtube_video(
                url,
                output_path=args.output,
                audio_only=args.audio,
                cookies_browser=args.cookies_from_browser,
                cookies_file=args.cookies,
                use_oauth=args.oauth
            )
            print("-" * 50)

if __name__ == "__main__":
    main()
