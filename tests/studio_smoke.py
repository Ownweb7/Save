"""Verify the studio visual layer, motion controls and responsive pages.
Run: python tests/studio_smoke.py (requires Python Playwright and Chromium).
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import shutil
from playwright.sync_api import sync_playwright

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
        page = browser.new_page(viewport={'width': 1440, 'height': 1000})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(base_url, wait_until='domcontentloaded')
        page.wait_for_timeout(1500)
        assert page.locator('#motion-toggle').get_attribute('aria-pressed') == 'true'
        page.evaluate("window.beforeFrame = document.querySelector('canvas').toDataURL()")
        page.wait_for_timeout(200)
        assert page.evaluate("window.beforeFrame !== document.querySelector('canvas').toDataURL()")
        page.mouse.move(150, 250)
        assert page.evaluate("document.documentElement.style.getPropertyValue('--pointer-x')") == '150px'
        assert page.locator('.studio-hero').evaluate('e => e.offsetHeight') < 700
        assert page.locator('.studio-process').evaluate('e => e.offsetHeight') < 700
        for selector in ['.lab-copy', '.philosophy-grid > div:first-child']:
            assert page.locator(selector).evaluate('e => getComputedStyle(e).position') == 'static'
        heading = page.locator('.section-heading h2')
        heading.evaluate("e => scrollTo({top: e.getBoundingClientRect().top + scrollY - innerHeight * .82, behavior: 'instant'})")
        page.wait_for_function("parseFloat(document.querySelector('.section-heading h2').style.getPropertyValue('--word-roll')) > 0")
        heading.evaluate("e => scrollTo({top: e.getBoundingClientRect().top + scrollY - innerHeight * .4, behavior: 'instant'})")
        page.wait_for_function("parseFloat(document.querySelector('.section-heading h2').style.getPropertyValue('--word-roll')) === 0")
        card = page.locator('.app-card').first
        card.evaluate("e => scrollTo({top: e.offsetParent.getBoundingClientRect().top + scrollY + e.offsetTop - innerHeight * .85, behavior: 'instant'})")
        page.wait_for_function("parseFloat(document.querySelector('.app-card').style.getPropertyValue('--roll-angle')) > 0")
        card.evaluate("e => scrollTo({top: e.offsetParent.getBoundingClientRect().top + scrollY + e.offsetTop - innerHeight * .35, behavior: 'instant'})")
        page.wait_for_function("parseFloat(document.querySelector('.app-card').style.getPropertyValue('--roll-angle')) === 0")
        # Native End/Home and wheel scrolling must remain available to the footer.
        page.evaluate('document.activeElement.blur()')
        page.keyboard.press('End')
        page.wait_for_function('scrollY + innerHeight >= document.documentElement.scrollHeight - 3')
        assert page.locator('.footer-bottom').is_visible()
        page.keyboard.press('Home')
        page.wait_for_function('scrollY < 2')
        page.mouse.wheel(0, 400)
        page.wait_for_function('scrollY > 100')
        page.evaluate("scrollTo({top:0,behavior:'instant'})")
        print('Compact flow, scroll-linked rolls, and native wheel/keyboard scrolling passed.', flush=True)

        page.locator('#motion-toggle').click()
        assert page.locator('#motion-toggle').get_attribute('aria-pressed') == 'false'
        page.evaluate("window.beforeFrame = document.querySelector('canvas').toDataURL()")
        page.wait_for_timeout(200)
        assert page.evaluate("window.beforeFrame === document.querySelector('canvas').toDataURL()")
        assert page.locator('.marquee-track').evaluate('e => getComputedStyle(e).animationName') == 'none'
        assert page.locator('.roll-word').first.evaluate('e => getComputedStyle(e).transform') == 'none'
        assert page.locator('.roll-card').first.evaluate('e => getComputedStyle(e).transform') == 'none'
        page.reload(wait_until='domcontentloaded')
        assert page.locator('#motion-toggle').get_attribute('aria-pressed') == 'false'
        page.locator('#motion-toggle').click()
        assert page.locator('#motion-toggle').get_attribute('aria-pressed') == 'true'
        page.emulate_media(reduced_motion='reduce')
        page.wait_for_function("document.documentElement.dataset.motion === 'off'")
        assert page.locator('#motion-toggle').is_disabled()
        assert page.locator('.marquee-track').evaluate('e => getComputedStyle(e).animationName') == 'none'
        print('Reactive canvas, pause/resume, session preference and reduced motion passed.', flush=True)
        for width in [1440, 768, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 900})
            for path in root.glob('*.html'):
                page.goto(f'{base_url}/{path.name}', wait_until='domcontentloaded')
                assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), (path.name, width)
                assert page.locator('main').count() == 1
                assert page.locator('h1').count() == 1
            print(f'All pages fit {width}px.', flush=True)
        page.set_viewport_size({'width': 390, 'height': 844})
        page.goto(base_url, wait_until='domcontentloaded')
        page.get_by_role('button', name='Open navigation').click()
        page.locator('#navigation').get_by_role('link', name='Playground').click()
        assert not page.locator('#navigation').is_visible()
        assert page.locator('#playground').is_visible()
        no_js = browser.new_page(java_script_enabled=False)
        no_js.goto(base_url, wait_until='domcontentloaded')
        assert no_js.get_by_role('heading', name='Small apps. Big feeling.').is_visible()
        assert no_js.locator('.app-card').count() == 5
        assert no_js.locator('a[href="about.html"]').first.is_visible()
        assert not errors, errors
        print('Mobile navigation and no-JavaScript content passed; no browser errors.', flush=True)
        browser.close()
finally:
    server.shutdown()
    server.server_close()
