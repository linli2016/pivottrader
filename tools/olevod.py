import re
import aiohttp
import asyncio
from bs4 import BeautifulSoup
import requests


async def get_html(session, url):
    while True:        
        async with session.get(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"}) as response:
            assert response.status == 200
            html = await response.text()

        # print(html)

        ddos_flag = '<p>Please allow up to <span class="ui-counter"'
        if html.find(ddos_flag) == -1:            
            return html
        
        print('DDOS waiting ...')
        await asyncio.sleep(1)
    

async def find_episode_m3u8(session, url):
    html = await get_html(session, url)
    pattern = re.compile(r'"url":\s*"(https:[^"]+master\.m3u8)"')
    match = pattern.search(html)
    if match:
        m3u8_url = match.group(1).replace("\\", "")
        print(m3u8_url)
    else:
        print('not find m3u8 url', url)
        with open('debug_html.txt', 'w', encoding='utf-8') as f:
            f.write(html)
        return


    
async def get_movie_playlist(session, url):    
    html = await get_html(session, url)
    # print('get_movie_playlist', html)
    soup = BeautifulSoup(html, 'html.parser')
    playlist = soup.find('ul', class_='content_playlist clearfix')

    if playlist:
        for link in playlist.find_all('a', href=True):
            href = link['href']
            if href.startswith("/index.php/vod/play/id/"):
                episode_url = f"https://olevod.com{href}"
                await find_episode_m3u8(session, episode_url)


async def olevod(id: int):
    url = f"https://olevod.com/index.php/vod/play/id/{id}/sid/1/nid/1.html"
    async with aiohttp.ClientSession() as session:
        await get_movie_playlist(session, url)


def olevod_live(id: int, vv: str):
    url = f"https://api.olelive.com/v1/pub/vod/detail/{id}/true?_vv={vv}"
    response = requests.get(url)
    data = response.json()

    for url in data['data']['urls']:
        print(url['url'])


if __name__ == "__main__":
    # asyncio.run(olevod_live(id=79213, vv='e56040b17161820a0ce1a76a3ee37e54'))

    asyncio.run(olevod(id=83882))
