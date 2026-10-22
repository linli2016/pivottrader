import argparse
import requests
from urllib.parse import urlparse, urlunparse, urljoin
from os.path import dirname
import tempfile
import re
import os
import subprocess
import shutil

def main():
    # parser = argparse.ArgumentParser(description="Process m3u8 file for encrypted video download.")
    # parser.add_argument("m3u8_url", help="URL of the m3u8 file, e.g., https://test.com/1080.m3u8?a=a&b=b")
    # parser.add_argument("key_url", help="URL of the decryption key file, e.g., https://test.com/1080.key?a=a&b=b")
    # args = parser.parse_args()

    # m3u8_url = args.m3u8_url
    # key_url = args.key_url

    m3u8_url = "https://hls2.videos.sproutvideo.com/8de2bd3fa51ebc1ae097fca2b028d00d/a1719ab85e14664b909d1adcb0b43f6c/video/1080.m3u8?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9obHMyLnZpZGVvcy5zcHJvdXR2aWRlby5jb20vOGRlMmJkM2ZhNTFlYmMxYWUwOTdmY2EyYjAyOGQwMGQvYTE3MTlhYjg1ZTE0NjY0YjkwOWQxYWRjYjBiNDNmNmMvKi5tM3U4P3Nlc3Npb25JRD1kZjQ0ZjIwNi0yYmU5LTQzYWQtOGE1NC0xYjhmZGZiZGJhOTIiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3NTgwMDExOTV9fX1dfQ__&Signature=c3TW1oGy7EiK9HE~8NHYdxuyQFu0GOzxN9t2HJhRxltlL6bTpBHY7~Yl2wgSXnFwC3vpsqob~ehJv7xw7j~1NXJPzsx7cJXprzGueKXFELynh2ij8i7kbbdQLVZ8Lf7T4NZn94VgaZQltb4x4jM6kXaQHtcdsvkDyKpX9rD2DE29AUwjCa-kGe17Ou5htJdor0CFPZqqQ0a0nGDbEC~ic~Z5-pJ4l-VFcdIM4vFoYWfHgFRULpypAYmecjbyGn4as5GAXskD6T6qEQufDTCwQiNhG-bApYpXJ-r3vVgBz0la55pCyy5Nm5DiwBRS5htLOp0kSWIjp5iK51bkcDFHLA__&Key-Pair-Id=APKAIB5DGCGAQJ4GGIUQ&sessionID=df44f206-2be9-43ad-8a54-1b8fdfbdba92"
    key_url = "https://hls2.videos.sproutvideo.com/8de2bd3fa51ebc1ae097fca2b028d00d/a1719ab85e14664b909d1adcb0b43f6c/video/1080.key?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9obHMyLnZpZGVvcy5zcHJvdXR2aWRlby5jb20vOGRlMmJkM2ZhNTFlYmMxYWUwOTdmY2EyYjAyOGQwMGQvYTE3MTlhYjg1ZTE0NjY0YjkwOWQxYWRjYjBiNDNmNmMvKi5rZXk~c2Vzc2lvbklEPWRmNDRmMjA2LTJiZTktNDNhZC04YTU0LTFiOGZkZmJkYmE5MiIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc1ODAwMTE5NX19fV19&Signature=rZfX1ECd~~uE0YCspbk5ywk3e-NaZK4boW1UFGRB0o2-aK63ZFwkCoTrRqkdeYtEHOsgSSx~WzSqg~gViKLhqNa4anqU~YTD4Zi7V350EW~Xf2LLX3T2ZlRzR-Sktoj59p5-6VE4SmWmmdQwJ4jlksoHSa9OJFYMlnV032hcpPoavAV1HZNNd2sVZuGoYQcKWNVe7Nnbbpi3gzwODFmlLDbfduGPFxQgvEHsoNCXKjraa6LUj-zr7z8va5atqT4-oizOC23AAcr3D7HPdascut7aIjkNcTJY5s0oiGmlqYQkZ0lkZvRLF7a1sirLuwS4h-jmBRWIVNBfv3xrjN1ixA__&Key-Pair-Id=APKAIB5DGCGAQJ4GGIUQ&sessionID=df44f206-2be9-43ad-8a54-1b8fdfbdba92"
    ts_url = "https://hls2.videos.sproutvideo.com/8de2bd3fa51ebc1ae097fca2b028d00d/a1719ab85e14664b909d1adcb0b43f6c/video/1080_00000.ts?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9obHMyLnZpZGVvcy5zcHJvdXR2aWRlby5jb20vOGRlMmJkM2ZhNTFlYmMxYWUwOTdmY2EyYjAyOGQwMGQvYTE3MTlhYjg1ZTE0NjY0YjkwOWQxYWRjYjBiNDNmNmMvKi50cz9zZXNzaW9uSUQ9ZGY0NGYyMDYtMmJlOS00M2FkLThhNTQtMWI4ZmRmYmRiYTkyIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzU4MDAxMTk1fX19XX0_&Signature=QUmaLyPctrtH7d7-5OrCkLZMWYPiS19vmFaiSr0~cnw3D6YcQWzWztaco1ajTAf9hxWMoRNGBI3Vk7QMU3jyQUG2wdQpq5NeXbD5YYI-oA1S-mOIYMkIArP8xxOf0DXs8DTUOuucVgAz~8RDoRMRU2KduFq-pldIkueR1lfpFaJiqu~r-WIpIM-erGkKWbhPP17Ycv7j0b~yaooCzx8iZgMJSnldyy8d-Vyre~oai7XQcEnRhQfd~AJopFX8SAf~wfmySv6MZjWCisUUAigJTo2mcpFH2-YkxDrVUdpHd8v4EP0X1DqWLGdLRdaxCtJmJ8C9-IZV6Kqolih3ohyKqQ__&Key-Pair-Id=APKAIB5DGCGAQJ4GGIUQ&sessionID=df44f206-2be9-43ad-8a54-1b8fdfbdba92"
    output_file = '29.mp4'

    # Parse m3u8_url to get base URL and parameters
    parsed = urlparse(ts_url)
    scheme = parsed.scheme
    netloc = parsed.netloc
    path = parsed.path
    query = parsed.query

    base_dir = dirname(path)
    base_url = urlunparse((scheme, netloc, base_dir + '/', '', '', ''))
    params = '?' + query if query else ''

    # Download m3u8 file
    response = requests.get(m3u8_url)
    if response.status_code != 200:
        raise Exception(f"Failed to download m3u8: {response.status_code}")

    # Store to temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.m3u8') as temp_m3u8:
        temp_m3u8.write(response.content)
        temp_m3u8_path = temp_m3u8.name

    # Read and modify the m3u8 content
    with open(temp_m3u8_path, 'r') as f:
        lines = f.readlines()

    updated_lines = []
    for line in lines:
        stripped_line = line.strip()
        if stripped_line.startswith('#EXT-X-KEY'):
            # Replace the URI in #EXT-X-KEY with the provided key_url (assuming quoted URI)
            updated_line = re.sub(r'URI="[^"]*"', f'URI="{key_url}"', line)
            updated_lines.append(updated_line)
        elif not stripped_line.startswith('#') and stripped_line.endswith('.ts'):
            # Prepend base URL and append parameters to .ts chunks
            full_ts_url = urljoin(base_url, stripped_line) + params
            updated_lines.append(full_ts_url + '\n')
        else:
            updated_lines.append(line)

    # Store updated m3u8 to another temporary file
    with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.m3u8') as updated_m3u8:
        # print(updated_lines)
        # print(updated_m3u8)
        updated_m3u8.writelines(updated_lines)
        updated_m3u8_path = updated_m3u8.name

    # Construct ffmpeg command    
    ffmpeg_cmd = (
        f'ffmpeg -protocol_whitelist file,http,https,tcp,tls,crypto,data '
        f'-i "{updated_m3u8_path}" -c copy {output_file}'
    )
    print("Constructed ffmpeg command:")
    print(ffmpeg_cmd)

    # Run ffmpeg command
    print("\nRunning ffmpeg command...")
    try:
        result = subprocess.run(ffmpeg_cmd, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"Successfully downloaded video to {output_file}")
        else:
            print(f"ffmpeg failed with error:\n{result.stderr}")
    except subprocess.SubprocessError as e:
        print(f"Error running ffmpeg: {e}")

    # Optional: Print paths for reference (files persist until manually deleted)
    print(f"\nTemporary m3u8 path: {temp_m3u8_path}")
    print(f"Updated m3u8 path: {updated_m3u8_path}")

    # Note: To clean up temp files after use, you can uncomment:
    os.remove(temp_m3u8_path)
    os.remove(updated_m3u8_path)

if __name__ == "__main__":
    main()

