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
        page.evaluate('document.fonts.ready')
        page.wait_for_timeout(1500)
        assert page.locator('#motion-toggle').get_attribute('aria-pressed') == 'true'
        page.evaluate("window.beforeFrame = document.querySelector('canvas').toDataURL()")
        page.wait_for_timeout(200)
        assert page.evaluate("window.beforeFrame !== document.querySelector('canvas').toDataURL()")
        page.mouse.move(150, 250)
        assert page.evaluate("document.documentElement.style.getPropertyValue('--pointer-x')") == '150px'
        # The hero responds to a pointer without taking over native scrolling.
        stage = page.locator('.app-stage')
        bounds = stage.bounding_box()
        page.mouse.move(bounds['x'] + bounds['width'] * .85, bounds['y'] + bounds['height'] * .65)
        page.wait_for_function("parseFloat(document.querySelector('.app-stage').style.getPropertyValue('--stage-turn')) > .5")
        page.mouse.move(10, 10)
        page.wait_for_function("Math.abs(parseFloat(document.querySelector('.app-stage').style.getPropertyValue('--stage-turn'))) < .05")
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
        page.evaluate("window.nativeScrollEnded = false; addEventListener('scrollend', () => { window.nativeScrollEnded = true; }, {once:true})")
        page.keyboard.press('End')
        page.wait_for_function('window.nativeScrollEnded && scrollY + innerHeight >= document.documentElement.scrollHeight - 3')
        assert page.locator('.footer-bottom').is_visible()
        page.evaluate("window.nativeScrollEnded = false; addEventListener('scrollend', () => { window.nativeScrollEnded = true; }, {once:true})")
        page.keyboard.press('Home')
        page.wait_for_function('window.nativeScrollEnded && scrollY < 2')
        page.mouse.move(720, 750)
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
        assert stage.evaluate("e => parseFloat(e.style.getPropertyValue('--stage-turn'))") == 0
        bounds = stage.bounding_box()
        page.mouse.move(bounds['x'] + bounds['width'] * .85, bounds['y'] + bounds['height'] * .65)
        page.wait_for_timeout(200)
        assert stage.evaluate("e => parseFloat(e.style.getPropertyValue('--stage-turn'))") == 0
        page.reload(wait_until='domcontentloaded')
        assert page.locator('#motion-toggle').get_attribute('aria-pressed') == 'false'
        page.locator('#motion-toggle').click()
        assert page.locator('#motion-toggle').get_attribute('aria-pressed') == 'true'
        page.emulate_media(reduced_motion='reduce')
        page.wait_for_function("document.documentElement.dataset.motion === 'off'")
        assert page.locator('#motion-toggle').is_disabled()
        assert page.locator('.marquee-track').evaluate('e => getComputedStyle(e).animationName') == 'none'
        # Every product preview leads to its actual catalog entry and working demo.
        catalog = page.evaluate('window.ODN_APPS')
        showcase_tabs = page.locator('.showcase-tabs')
        assert showcase_tabs.get_attribute('role') == 'tablist'
        assert showcase_tabs.get_by_role('tab').count() == 5
        panel = page.locator('#showcase-panel')
        assert panel.get_attribute('role') == 'tabpanel'
        for app in catalog:
            app_id = app['id']
            tab = page.locator(f'#showcase-tab-{app_id}')
            tab.click()
            assert tab.get_attribute('aria-selected') == 'true'
            assert tab.get_attribute('tabindex') == '0'
            assert showcase_tabs.locator('[aria-selected="true"]').count() == 1
            assert showcase_tabs.locator('[tabindex="0"]').count() == 1
            assert panel.get_attribute('aria-labelledby') == f'showcase-tab-{app_id}'
            assert page.locator('#showcase-name').inner_text() == app['name']
            assert page.locator('#showcase-store').get_attribute('href') == app['url']
            assert page.locator('#showcase-try').get_attribute('data-try') == app_id
            assert page.locator('[data-preview]:visible').count() == 1
            assert page.locator(f'[data-preview="{app_id}"]').is_visible()
            page.locator('#showcase-try').focus()
            page.keyboard.press('Enter')
            assert page.locator(f'#tab-{app_id}').get_attribute('aria-selected') == 'true'
            page.wait_for_function(f"document.activeElement === document.querySelector('#tab-{app_id}')")
        # Product selection works without a pointer, with one tab stop in the strip.
        page.locator('#showcase-tab-save').focus()
        for key, expected in [('ArrowRight', 'bond'), ('ArrowLeft', 'save'),
                              ('ArrowLeft', 'clock'), ('Home', 'save'), ('End', 'clock')]:
            page.keyboard.press(key)
            selected = page.locator(f'#showcase-tab-{expected}')
            assert selected.get_attribute('aria-selected') == 'true'
            assert selected.evaluate('e => document.activeElement === e')
            assert showcase_tabs.locator('[tabindex="0"]').count() == 1
        print('All five product previews, catalog links, demo entry points and keyboard tabs passed.', flush=True)
        print('Reactive app stage and canvas, pause/resume, session preference and reduced motion passed.', flush=True)
        for width in [1440, 768, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 900})
            for path in root.glob('*.html'):
                page.goto(f'{base_url}/{path.name}', wait_until='domcontentloaded')
                page.evaluate('document.fonts.ready')
                assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), (path.name, width)
                assert page.locator('main').count() == 1
                assert page.locator('h1').count() == 1
                if path.name == 'index.html':
                    for app in catalog:
                        page.locator(f'#showcase-tab-{app["id"]}').click()
                        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), (app['id'], width)
                        preview = page.locator(f'[data-preview="{app["id"]}"]')
                        assert preview.is_visible()
                        # All sample content fits above the phone's home indicator.
                        layout = preview.evaluate("""e => {
                            const home = e.closest('.phone-screen').querySelector('.phone-home');
                            return {sameParent: e.offsetParent === home.offsetParent,
                                previewBottom: e.offsetTop + e.offsetHeight, homeTop: home.offsetTop};
                        }""")
                        assert layout['sameParent'] and layout['previewBottom'] <= layout['homeTop'], (app['id'], width, layout)
            print(f'All pages fit {width}px.', flush=True)
        page.set_viewport_size({'width': 390, 'height': 844})
        page.goto(base_url, wait_until='domcontentloaded')
        page.get_by_role('button', name='Open navigation').click()
        page.locator('#navigation').get_by_role('link', name='Playground').click()
        assert not page.locator('#navigation').is_visible()
        assert page.locator('#playground').is_visible()
        no_js = browser.new_page(java_script_enabled=False)
        no_js.goto(base_url, wait_until='domcontentloaded')
        assert no_js.get_by_role('heading', name='Small apps. Better everyday.').is_visible()
        assert no_js.locator('#showcase-name').inner_text() == 'Save+'
        assert no_js.locator('#showcase-store').get_attribute('href') == catalog[0]['url']
        assert no_js.locator('.app-card').count() == 5
        assert no_js.locator('a[href="about.html"]').first.is_visible()
        assert not errors, errors
        print('Mobile navigation and no-JavaScript content passed; no browser errors.', flush=True)
        browser.close()
finally:
    server.shutdown()
    server.server_close()
