"""Verify cinematic navigation, motion controls and responsive destination pages.
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
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        page.add_init_script("""window.testAudioContexts = [];
            const NativeAudio = window.AudioContext;
            if (NativeAudio) window.AudioContext = class extends NativeAudio {
                constructor(...args) { super(...args); window.testAudioContexts.push(this); }
            };""")
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))

        def open_eyes():
            page.goto(base_url, wait_until='domcontentloaded')
            page.evaluate("scrollTo({top:(document.querySelector('.cinematic-intro').offsetHeight-document.querySelector('.cinema-stage').offsetHeight)*.82,behavior:'instant'})")
            page.wait_for_function('!document.querySelector(".eye-navigation").inert')

        page.goto(base_url, wait_until='networkidle')
        page.evaluate('document.fonts.ready')
        assert page.locator('.site-footer,#apps,#creative-world,#studio-intro,#approach,.raven-wing').count() == 0
        assert page.locator('#motion-toggle').get_attribute('aria-pressed') == 'true'
        assert page.locator('.portrait-image').evaluate('e => e.complete && e.naturalWidth > 1000')
        assert page.evaluate('window.testAudioContexts.length') == 0
        page.locator('#sound-toggle').click()
        page.wait_for_function('document.querySelector("#sound-toggle").getAttribute("aria-pressed") === "true"')
        assert page.evaluate('window.testAudioContexts[0].state') == 'running'
        page.locator('#sound-toggle').click()
        assert page.locator('#sound-toggle').get_attribute('aria-pressed') == 'false'
        assert page.locator('.eye-navigation').evaluate('e=>e.inert')
        page.mouse.move(1250, 280)
        page.wait_for_function("Math.abs(parseFloat(document.querySelector('.cinema-stage').style.getPropertyValue('--portrait-x'))) > 2")
        page.mouse.wheel(0, 300)
        page.wait_for_function('scrollY > 100')
        open_eyes()
        assert page.locator('#scene-number').inner_text() == '02'
        assert float(page.locator('.cinema-stage').evaluate("e=>e.style.getPropertyValue('--eyes-opacity')")) == 1
        assert page.locator('.site-header').evaluate("e=>getComputedStyle(e).backgroundColor") == 'rgba(0, 0, 0, 0)'
        page.locator('.eye-portal-left').click()
        page.wait_for_url('**/apps.html')
        assert page.locator('.app-card').count() == 5
        open_eyes()
        page.locator('.eye-portal-right').click()
        page.wait_for_url('**/about.html')
        assert page.get_by_role('heading', name='The makers. The studio.').is_visible()
        assert page.locator('#approach').count() == 1
        assert '2022' in page.locator('.studio-story').inner_text()
        assert 'Hisar' in page.locator('.studio-story').inner_text()
        assert page.locator('.site-footer').count() == 1
        assert page.locator('.studio-projects a').count() == 5
        assert page.locator('.studio-value-grid article').count() == 3
        page.locator('.studio-collection-link').click()
        page.wait_for_url('**/apps.html')
        open_eyes()
        page.evaluate("document.activeElement.blur(); window.nativeScrollDone=false; addEventListener('scrollend',()=>window.nativeScrollDone=true,{once:true})")
        page.keyboard.press('End')
        page.wait_for_function('window.nativeScrollDone && scrollY + innerHeight >= document.documentElement.scrollHeight - 3')
        assert page.locator('.eye-navigation').is_visible()
        page.evaluate("window.nativeScrollDone=false; addEventListener('scrollend',()=>window.nativeScrollDone=true,{once:true})")
        page.keyboard.press('Home')
        page.wait_for_function('window.nativeScrollDone && scrollY < 2')
        print('Separate eye destinations, studio content, transparent header, native scroll and opt-in sound passed.', flush=True)

        for width, height in [(1440,844),(1024,844),(768,844),(600,844),(390,844),(320,667),(844,390)]:
            page.set_viewport_size({'width':width,'height':height})
            page.evaluate("scrollTo({top:(document.querySelector('.cinematic-intro').offsetHeight-document.querySelector('.cinema-stage').offsetHeight)*.82,behavior:'instant'})")
            page.wait_for_function('!document.querySelector(".eye-navigation").inert')
            page.wait_for_timeout(100)
            assert page.locator('.eye-portal').evaluate_all("""links=>links.every(e=>{
                const b=e.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);
                return b.x>=0 && b.right<=innerWidth && b.y>68 && b.bottom<innerHeight && (e===hit||e.contains(hit));
            })"""),(width,page.locator(".eye-portal").evaluate_all("links=>links.map(e=>e.getBoundingClientRect().toJSON())"),page.evaluate("scrollY"))
        page.set_viewport_size({'width':1440,'height':900})
        page.locator('#motion-toggle').click()
        page.wait_for_function('document.querySelector(".eye-navigation").inert')
        for selector in ['.portrait-image','.floating-embers i']:
            assert page.locator(selector).first.evaluate('e=>getComputedStyle(e).animationName') == 'none',selector
        page.reload(wait_until='domcontentloaded')
        assert page.locator('#motion-toggle').get_attribute('aria-pressed') == 'false'
        page.locator('#motion-toggle').click()
        page.emulate_media(reduced_motion='reduce')
        page.wait_for_function("document.documentElement.dataset.motion === 'off'")
        assert page.locator('#motion-toggle').is_disabled()
        assert page.locator('.cinematic-intro').evaluate('e=>e.offsetHeight') == 900
        catalog = page.evaluate('window.ODN_APPS')
        page.goto(f'{base_url}/apps.html',wait_until='domcontentloaded')
        assert page.locator('.portal-copy h1').inner_text() == 'Imagination.\nMade useful.'
        assert page.locator('.creative-world').bounding_box()['y'] == 0
        # The moved portal fills its frame and every app opens its own URL.
        assert page.locator('.portal-landscape').evaluate("""e=>{
            const image=e.getBoundingClientRect(), scene=e.parentElement.getBoundingClientRect();
            return image.top<=scene.top && image.bottom>=scene.bottom && image.left<=scene.left && image.right>=scene.right;
        }""")
        for selector in ['.portal-landscape','.portal-radiance','.portal-particles i']:
            assert page.locator(selector).first.evaluate('e=>getComputedStyle(e).animationName') == 'none',selector
        for app in catalog:
            page.locator(f'[data-world-app="{app["id"]}"]').click()
            page.wait_for_url(f'**/{app["page"]}')
            assert page.locator('h1').inner_text() == app['name']
            page.goto(f'{base_url}/apps.html', wait_until='domcontentloaded')
        page.locator('.portal-collection-link').click()
        page.wait_for_url('**/apps.html#apps')
        assert page.locator('#app-search').is_visible()
        # The Studio portfolio uses the same real destinations.
        for app in catalog:
            page.goto(f'{base_url}/about.html',wait_until='domcontentloaded')
            page.locator(f'.studio-project[href="{app["page"]}"]').click()
            page.wait_for_url(f'**/{app["page"]}')
            assert page.locator('h1').inner_text() == app['name']
        print('Responsive eye targets, portal destinations, pause persistence and reduced motion passed.',flush=True)

        page.goto(f'{base_url}/apps.html', wait_until='domcontentloaded')
        for app in catalog:
            assert page.locator(f'#app-{app["id"]} .app-feature-list li').all_text_contents() == app['features']
        page.goto(f'{base_url}/save-plus.html', wait_until='domcontentloaded')
        # Pointer response resets when the system disables motion.
        page.emulate_media(reduced_motion='no-preference')
        page.wait_for_function("document.documentElement.dataset.motion === 'on'")
        stage = page.locator('.app-stage')
        stage.scroll_into_view_if_needed()
        bounds = stage.bounding_box()
        page.mouse.move(bounds['x']+bounds['width']*.85,bounds['y']+bounds['height']*.65)
        page.wait_for_function("parseFloat(document.querySelector('.app-stage').style.getPropertyValue('--stage-turn')) > .5")
        page.emulate_media(reduced_motion='reduce')
        page.wait_for_function("document.documentElement.dataset.motion === 'off'")
        assert stage.evaluate("e=>parseFloat(e.style.getPropertyValue('--stage-turn'))") == 0
        print('Catalog features and dedicated app page pointer response passed.',flush=True)

        for width in [1440, 1024, 768, 600, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 900})
            for path in root.glob('*.html'):
                page.goto(f'{base_url}/{path.name}', wait_until='domcontentloaded')
                page.evaluate('document.fonts.ready')
                assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), (path.name,width)
                assert page.locator('main').count() == 1
                assert page.locator('h1').count() == 1
                assert page.locator('.site-footer').count() == (0 if path.name=='index.html' else 1)
                if path.name in [app['page'] for app in catalog]:
                    assert page.locator('[data-preview]').count() == 1
                    assert page.locator('[data-preview]').evaluate("""e=>e.offsetTop+e.offsetHeight<=e.closest('.phone-screen').querySelector('.phone-home').offsetTop"""),(path.name,width)
            print(f'All 16 pages fit {width}px.',flush=True)
        page.set_viewport_size({'width':390,'height':844})
        page.goto(base_url,wait_until='domcontentloaded')
        page.get_by_role('button',name='Open navigation').click()
        page.locator('#navigation').get_by_role('link',name='Our apps',exact=True).click()
        page.wait_for_url('**/apps.html')
        assert not page.locator('#navigation').is_visible()
        no_js = browser.new_page(java_script_enabled=False)
        no_js.emulate_media(reduced_motion='reduce')
        no_js.goto(base_url,wait_until='domcontentloaded')
        assert no_js.get_by_role('heading',name='A little wonder. In your everyday.').is_visible()
        no_js.locator('.cinema-enter').click()
        no_js.wait_for_url('**/apps.html')
        no_js.locator('[data-world-app="save"]').click()
        no_js.wait_for_url('**/save-plus.html')
        no_js.locator('.product-back').click()
        no_js.wait_for_url('**/apps.html')
        assert no_js.locator('.app-card').count() == 5
        assert no_js.locator('.app-card .app-feature-list li').count() == 15
        no_js.locator('#app-glow .app-art').click()
        no_js.wait_for_url('**/glowcalc.html')
        assert no_js.locator('h1').inner_text() == 'GlowCalc'
        assert not errors,errors
        print('Mobile navigation and no-JavaScript journeys passed; no browser errors.',flush=True)
        browser.close()
finally:
    server.shutdown()
    server.server_close()
