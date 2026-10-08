"""Verify continuous portal zoom, reverse scrolling, destinations and motion preferences."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import shutil
from playwright.sync_api import sync_playwright, expect


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


root = Path(__file__).resolve().parents[1]
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(root)))
Thread(target=server.serve_forever, daemon=True).start()
base_url = f'http://127.0.0.1:{server.server_port}'
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=shutil.which('chromium'), args=['--no-sandbox'])
        page = browser.new_page(viewport={'width':1440, 'height':900})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.add_init_script("localStorage.setItem('odn-background-theme','fantasy')")

        def settle():
            page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')

        def scroll_to(progress):
            page.evaluate('p=>scrollTo({top:(document.querySelector(".cinematic-intro").offsetHeight-document.querySelector(".cinema-stage").offsetHeight)*p,behavior:"instant"})', progress)
            settle()

        def destinations_reachable():
            assert page.locator('.eye-portal').evaluate_all('''links=>links.every(e=>{
                const b=e.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);
                return b.left>=0 && b.right<=innerWidth && b.top>68 && b.bottom<innerHeight && e.contains(hit);
            })''')

        for width, height in [(1440,900),(1024,844),(768,844),(390,844),(320,667),(844,390)]:
            page.set_viewport_size({'width':width, 'height':height})
            page.goto(base_url, wait_until='networkidle')
            expect(page.locator('html')).to_have_attribute('data-background', 'fantasy')
            scroll_to(0)
            expect(page.locator('.cinema-enter')).to_be_visible()
            image = page.locator('.portrait-image')
            original = image.bounding_box()
            widths = []
            for progress in [0, .25, .55, .95]:
                scroll_to(progress)
                expect(image).to_have_attribute('src', 'art/fantasy-portal.webp')
                assert page.locator('.portrait-scene').evaluate('e=>getComputedStyle(e).opacity') == '1'
                expect(page.locator('.eyes-scene')).to_be_hidden()
                bounds = image.bounding_box()
                widths.append(bounds['width'])
                # The same point inside the arch stays fixed as the surrounding landscape expands.
                assert abs(bounds['x'] + bounds['width'] * .5 - (original['x'] + original['width'] * .5)) < 2
                assert abs(bounds['y'] + bounds['height'] * .34 - (original['y'] + original['height'] * .34)) < 2
            assert all(a < b for a,b in zip(widths,widths[1:])), (width,widths)
            assert widths[-1] > widths[0] * 2, (width,widths)
            assert not page.locator('.eye-navigation').evaluate('e=>e.inert')
            destinations_reachable()
            scroll_to(0)
            assert abs(image.bounding_box()['width'] - original['width']) < 2
            assert page.locator('.cinema-opening').evaluate('e=>getComputedStyle(e).opacity') == '1'
            assert page.locator('.eye-navigation').evaluate('e=>e.inert')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        print('Same opening artwork, continuous centered zoom, reverse scroll and reachable destinations at six sizes passed.', flush=True)

        page.set_viewport_size({'width':1440,'height':900})
        for selector, destination in [('.eye-portal-left','apps.html'),('.eye-portal-right','about.html')]:
            page.goto(base_url, wait_until='networkidle')
            scroll_to(.95)
            page.locator(selector).click()
            page.wait_for_url(f'**/{destination}')

        # Switching styles at the end of the scroll must restore each theme's own scene.
        page.goto(base_url, wait_until='networkidle')
        scroll_to(.95)
        page.locator('#background-toggle').click()
        page.get_by_role('radio',name='Anime Ravens').check()
        expect(page.locator('html')).to_have_attribute('data-background','anime')
        settle()
        expect(page.locator('.eyes-scene')).to_be_visible()
        expect(page.locator('.eyes-scene img')).to_have_attribute('src','art/studio-eyes.webp')
        page.get_by_role('radio',name='Fantasy Portal').check()
        expect(page.locator('html')).to_have_attribute('data-background','fantasy')
        settle()
        page.keyboard.press('Escape')
        expect(page.locator('.eyes-scene')).to_be_hidden()
        destinations_reachable()

        page.locator('#motion-toggle').click()
        expect(page.locator('html')).to_have_attribute('data-motion','off')
        settle()
        assert page.locator('.portrait-scene').evaluate('e=>getComputedStyle(e).transform') == 'none'
        assert page.locator('.portrait-image').evaluate('e=>e.getAnimations().every(a=>a.playState!=="running")')
        expect(page.locator('.cinema-enter')).to_be_visible()
        page.reload(wait_until='networkidle')
        assert page.locator('.portrait-scene').evaluate('e=>getComputedStyle(e).transform') == 'none'
        page.locator('#motion-toggle').click()
        page.emulate_media(reduced_motion='reduce')
        expect(page.locator('html')).to_have_attribute('data-motion','off')
        settle()
        assert page.locator('.portrait-scene').evaluate('e=>getComputedStyle(e).transform') == 'none'
        assert page.locator('.eye-navigation').evaluate('e=>e.inert')
        page.locator('.cinema-enter').click()
        page.wait_for_url('**/apps.html')
        assert not errors, errors
        print('Apps and Studio navigation, theme switching, persisted pause and reduced motion passed; no browser errors.', flush=True)
        browser.close()
finally:
    server.shutdown()
    server.server_close()
