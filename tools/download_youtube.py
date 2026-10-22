#!/usr/bin/env python3
import yt_dlp
import os
import shutil
import argparse
try:
    import imageio_ffmpeg
except ImportError:
    imageio_ffmpeg = None


def download_youtube_video(url, output_path="downloads", audio_only=False, cookies_browser=None, use_oauth=False):
    if not os.path.exists(output_path):
        os.makedirs(output_path)
    
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
    
    # Don't halt entire playlist if an individual video is unavailable or encounters an error
    ydl_opts['ignoreerrors'] = 'only_download'

    if cookies_browser:
        ydl_opts['cookiesfrombrowser'] = (cookies_browser,)

    if use_oauth:
        ydl_opts['username'] = 'oauth2'
        ydl_opts['password'] = ''

    # Add ffmpeg location if available
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
            ydl.download([url])
            print(f"Download completed for {url}")
        except Exception as e:
            print(f"Error: {str(e)}")


def main():
    parser = argparse.ArgumentParser(description="Download YouTube videos or audio.")
    parser.add_argument("urls", nargs='*', help="YouTube URLs to download")
    parser.add_argument("--audio", action="store_true", help="Download audio only")
    parser.add_argument("-o", "--output", default="downloads", help="Output directory path (default: downloads)")
    parser.add_argument("--cookies-from-browser", help="Browser to load cookies from (e.g. chrome, firefox, safari)")
    parser.add_argument("--oauth", action="store_true", help="Use OAuth2 login")
    args = parser.parse_args()

    urls = args.urls
    if not urls:
        # Fallback to hardcoded list if no args provided (preserving original behavior for manual run without args)
        urls = [
            "https://www.youtube.com/playlist?list=PLU7_3ltndm4k0xjiaE9uwmxF-uR1lFYBK"
        ]

    # Download each video
    for url in urls:
        if url:
            download_youtube_video(
                url,
                output_path=args.output,
                audio_only=args.audio,
                cookies_browser=args.cookies_from_browser,
                use_oauth=args.oauth
            )
            print("-" * 50)

if __name__ == "__main__":
    main()
