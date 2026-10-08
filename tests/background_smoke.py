"""Exercise wallpaper selection, persistence, loading failures and accessible controls."""
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
themes = [
    ('war', 'War Sentinel', 'scifi-sentinel', 'scifi-visor'),
    ('anime', 'Anime Ravens', 'studio-ravens', 'studio-eyes'),
    ('battle', 'Battlefield', 'scifi-gate', 'scifi-gate'),
    ('scifi', 'Cyber Visor', 'scifi-visor', 'scifi-visor'),
    ('fantasy', 'Fantasy Portal', 'studio-portal', 'studio-portal'),
    ('eyes', 'Anime Eyes', 'studio-eyes', 'studio-eyes'),
]
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=shutil.which('chromium'), args=['--no-sandbox'])
        page = browser.new_page(viewport={'width':1440, 'height':900})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))

        def selected(theme_id):
            expect(page.locator('html')).to_have_attribute('data-background', theme_id)
            expect(page.locator(f'input[name=background][value={theme_id}]')).to_be_checked()
            assert page.locator('#background-panel').get_attribute('aria-busy') is None

        def open_picker():
            if page.locator('.menu-btn').is_visible():
                page.locator('.menu-btn').click()
            page.get_by_role('button', name='Background', exact=True).click()
            expect(page.locator('#background-panel')).to_be_visible()

        page.goto(base_url, wait_until='networkidle')
        selected('war')
        open_picker()
        expect(page.get_by_role('radio', name='War Sentinel')).to_be_focused()
        assert page.get_by_role('radio').count() == 6
        for theme_id, name, hero, detail in themes:
            page.get_by_role('radio', name=name).check()
            selected(theme_id)
            expect(page.locator('.portrait-image')).to_have_attribute('src', f'art/{hero}.webp')
            expect(page.locator('.eyes-scene img')).to_have_attribute('src', f'art/{detail}.webp')
            assert page.locator('.portrait-image,.eyes-scene img').evaluate_all('images=>images.every(i=>i.complete && i.naturalWidth>1000)')
        page.keyboard.press('ArrowLeft')
        selected('fantasy')
        page.keyboard.press('Escape')
        expect(page.locator('#background-panel')).to_be_hidden()
        expect(page.locator('#background-toggle')).to_be_focused()
        page.reload(wait_until='networkidle')
        selected('fantasy')
        for path, selector in [('apps.html','.portal-landscape'), ('about.html','.studio-backdrop img')]:
            page.goto(f'{base_url}/{path}', wait_until='networkidle')
            selected('fantasy')
            expect(page.locator(selector)).to_have_attribute('src', 'art/studio-portal.webp')
        for path in root.glob('*.html'):
            page.goto(f'{base_url}/{path.name}', wait_until='domcontentloaded')
            selected('fantasy')
            assert page.locator('#background-toggle').count() == 1, path
            if path.name not in ['index.html','apps.html','about.html']:
                assert 'studio-portal.webp' in page.locator('.background-wallpaper').evaluate('e=>getComputedStyle(e).backgroundImage'), path
        print('All six wallpapers, keyboard selection, reload and all-page persistence passed.', flush=True)

        page.goto(base_url, wait_until='networkidle')
        for width, height in [(1440,900),(1100,844),(1024,844),(1000,844),(768,844),(390,844),(320,667),(844,390)]:
            page.set_viewport_size({'width':width, 'height':height})
            open_picker()
            assert page.locator('#background-panel').evaluate('e=>{const b=e.getBoundingClientRect();return b.left>=0 && b.right<=innerWidth && b.top>=60 && b.bottom<=innerHeight}'), (width,height)
            if width <= 1000:
                expect(page.locator('#navigation')).not_to_have_class('nav-links open')
            page.get_by_role('radio', name='Anime Eyes').check()
            selected('eyes')
            assert page.locator('html').evaluate('e=>e.scrollWidth <= innerWidth'), width
            page.keyboard.press('Escape')
            expect(page.locator('.menu-btn' if width <= 1000 else '#background-toggle')).to_be_focused()
        page.set_viewport_size({'width':1440,'height':900})
        open_picker()
        page.locator('.cinema-kicker').click()
        expect(page.locator('#background-panel')).to_be_hidden()
        open_picker()
        page.keyboard.press('Shift+Tab')
        expect(page.get_by_role('button', name='Close background menu')).to_be_focused()
        page.keyboard.press('Enter')
        expect(page.locator('#background-panel')).to_be_hidden()
        page.emulate_media(reduced_motion='reduce')
        open_picker()
        page.get_by_role('radio', name='War Sentinel').check()
        selected('war')
        assert page.locator('.portrait-image').evaluate('e=>e.getAnimations().every(a=>a.playState!=="running")')
        page.keyboard.press('Escape')
        page.emulate_media(reduced_motion='no-preference')
        page.locator('#motion-toggle').click()
        open_picker()
        page.get_by_role('radio', name='Anime Ravens').check()
        selected('anime')
        assert page.locator('.portrait-image').evaluate('e=>e.getAnimations().every(a=>a.playState!=="running")')
        print('Responsive picker, dismissal, focus restoration and motion preferences passed.', flush=True)

        # With a slow first download, the latest choice must win.
        page.close()
        page = browser.new_page(viewport={'width':1440, 'height':900})
        page.on('pageerror', lambda error: errors.append(str(error)))
        pending = []
        page.route('**/art/studio-portal.webp', lambda route: pending.append(route))
        page.goto(base_url, wait_until='networkidle')
        open_picker()
        page.get_by_role('radio', name='Fantasy Portal').check()
        expect(page.locator('#background-status')).to_contain_text('Loading Fantasy Portal')
        page.get_by_role('radio', name='Anime Eyes').check()
        selected('eyes')
        assert pending
        with page.expect_response('**/art/studio-portal.webp'):
            pending.pop().continue_()
        page.wait_for_load_state('networkidle')
        selected('eyes')
        page.route('**/art/scifi-gate.webp', lambda route: route.abort())
        page.get_by_role('radio', name='Battlefield').click()
        expect(page.locator('#background-status')).to_contain_text('Couldn’t load Battlefield')
        selected('eyes')
        expect(page.locator('.portrait-image')).to_have_attribute('src', 'art/studio-eyes.webp')
        assert page.evaluate("localStorage.getItem('odn-background-theme')") == 'eyes'
        print('Slow-download race and failed-download recovery passed.', flush=True)

        page.close()
        page = browser.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.add_init_script("Storage.prototype.getItem=()=>{throw new Error('blocked')};Storage.prototype.setItem=()=>{throw new Error('blocked')}")
        page.goto(base_url, wait_until='networkidle')
        selected('war')
        open_picker()
        page.get_by_role('radio', name='Anime Ravens').check()
        selected('anime')
        expect(page.locator('#background-status')).to_contain_text('Storage unavailable')
        page.close()
        page = browser.new_page()
        page.add_init_script("localStorage.setItem('odn-background-theme','unknown-theme')")
        page.goto(base_url, wait_until='networkidle')
        selected('war')
        assert not errors, errors
        print('Blocked storage and invalid preference fallback passed; no browser errors.', flush=True)
        browser.close()
finally:
    server.shutdown()
