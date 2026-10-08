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
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        page.add_init_script("""window.testAudioContexts = [];
            const NativeAudio = window.AudioContext;
            if (NativeAudio) window.AudioContext = class extends NativeAudio {
                constructor(...args) { super(...args); window.testAudioContexts.push(this); }
            };""")
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(base_url, wait_until='networkidle')
        page.evaluate('document.fonts.ready')
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
        page.evaluate("scrollTo({top:(document.querySelector('.cinematic-intro').offsetHeight-innerHeight)*.82,behavior:'instant'})")
        page.wait_for_function('!document.querySelector(".eye-navigation").inert')
        assert page.locator('#scene-number').inner_text() == '02'
        assert float(page.locator('.cinema-stage').evaluate("e=>e.style.getPropertyValue('--eyes-opacity')")) == 1
        page.locator('.eye-portal-left').click()
        page.wait_for_url('**/#apps')
        page.wait_for_function('document.querySelector("#apps").getBoundingClientRect().top < 150')
        page.evaluate("scrollTo({top:(document.querySelector('.cinematic-intro').offsetHeight-innerHeight)*.82,behavior:'instant'})")
        page.wait_for_function('!document.querySelector(".eye-navigation").inert')
        page.locator('.eye-portal-right').click()
        page.wait_for_url('**/#studio-intro')
        page.wait_for_function('document.querySelector("#studio-intro").getBoundingClientRect().top < 150')
        page.wait_for_function('Math.abs(document.querySelector("#studio-intro").getBoundingClientRect().top - parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)) < 3')
        page.evaluate("document.activeElement.blur(); window.nativeScrollDone=false; addEventListener('scrollend',()=>window.nativeScrollDone=true,{once:true})")
        page.keyboard.press('End')
        page.wait_for_function('window.nativeScrollDone && scrollY + innerHeight >= document.documentElement.scrollHeight - 3')
        page.evaluate("window.nativeScrollDone=false; addEventListener('scrollend',()=>window.nativeScrollDone=true,{once:true})")
        page.keyboard.press('Home')
        page.wait_for_function('window.nativeScrollDone && scrollY < 2')
        print('Illustrated scene transition, both eye destinations, native scrolling and opt-in sound passed.', flush=True)

        # Both eye links remain visible and hittable after responsive artwork crops.
        for width in [1440, 1024, 768, 600, 390, 320]:
            page.set_viewport_size({'width':width,'height':844})
            page.evaluate("scrollTo({top:(document.querySelector('.cinematic-intro').offsetHeight-innerHeight)*.82,behavior:'instant'})")
            page.wait_for_function('!document.querySelector(".eye-navigation").inert')
            page.wait_for_timeout(100)
            assert page.locator('.eye-portal').evaluate_all("""links=>links.every(e=>{
                const b=e.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);
                return b.x>=0 && b.right<=innerWidth && b.y>68 && b.bottom<innerHeight && (e===hit||e.contains(hit));
            })"""),width
        page.set_viewport_size({'width':1440,'height':900})
        page.locator('#motion-toggle').click()
        assert page.locator('#motion-toggle').get_attribute('aria-pressed') == 'false'
        page.wait_for_function('document.querySelector(".eye-navigation").inert')
        assert page.locator('.portrait-scene').evaluate('e=>getComputedStyle(e).opacity') == '1'
        assert page.locator('.floating-feathers i').first.evaluate('e=>getComputedStyle(e).animationName') == 'none'
        page.reload(wait_until='domcontentloaded')
        assert page.locator('#motion-toggle').get_attribute('aria-pressed') == 'false'
        page.locator('#motion-toggle').click()
        assert page.locator('#motion-toggle').get_attribute('aria-pressed') == 'true'
        stage = page.locator('.app-stage')
        stage.scroll_into_view_if_needed()
        bounds = stage.bounding_box()
        page.mouse.move(bounds['x'] + bounds['width']*.85,bounds['y'] + bounds['height']*.65)
        page.wait_for_function("parseFloat(document.querySelector('.app-stage').style.getPropertyValue('--stage-turn')) > .5")
        page.emulate_media(reduced_motion='reduce')
        page.wait_for_function("document.documentElement.dataset.motion === 'off'")
        assert page.locator('#motion-toggle').is_disabled()
        assert page.locator('.cinematic-intro').evaluate('e=>e.offsetHeight') == 900
        assert page.locator('.marquee-track').evaluate('e=>getComputedStyle(e).animationName') == 'none'
        assert stage.evaluate("e=>parseFloat(e.style.getPropertyValue('--stage-turn'))") == 0
        print('Responsive eye targets, pause persistence, reactive preview and reduced motion passed.',flush=True)

        catalog = page.evaluate('window.ODN_APPS')
        world = page.locator('.orbit-apps')
        assert world.locator('[data-world-app]').count() == 5
        for app in catalog:
            link = world.locator(f'[data-world-app="{app["id"]}"]')
            link.click()
            assert page.locator(f'#showcase-tab-{app["id"]}').get_attribute('aria-selected') == 'true'
            assert world.locator('[aria-current="true"]').count() == 1
            assert link.get_attribute('aria-current') == 'true'
        world.locator('[data-world-app="glow"]').focus()
        page.keyboard.press('Enter')
        assert page.locator('#showcase-tab-glow').evaluate('e => document.activeElement === e')
        # Project detail navigation cycles the catalog and preserves focus.
        page.locator('#app-save .app-art').click()
        for app in catalog[1:] + catalog[:1]:
            page.get_by_role('button',name='Next app',exact=True).click()
            assert page.locator('#dialog-title').inner_text() == app['name']
            assert page.locator('.dialog-actions a').first.get_attribute('href') == app['url']
            assert page.get_by_role('button',name='Next app',exact=True).evaluate('e=>document.activeElement===e')
        page.get_by_role('button',name='Previous app',exact=True).click()
        assert page.locator('#dialog-title').inner_text() == 'LockClock Aurum'
        page.keyboard.press('Escape')
        page.wait_for_function('!document.body.classList.contains("dialog-open")')
        print('Portal app selection and project detail navigation passed.',flush=True)
        # The static product cards expose the same useful facts as the catalog.
        for app in catalog:
            card = page.locator(f'.app-card:has(.app-art[data-app="{app["id"]}"])')
            features = card.locator('.app-feature-list li')
            assert features.all_text_contents() == app['features'], app['id']
            assert all(features.nth(i).is_visible() for i in range(3)), app['id']
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
            about = page.locator('#showcase-about')
            assert about.get_attribute('data-app') == app_id
            assert about.get_attribute('href') == f'#app-{app_id}'
            assert page.locator('[data-preview]:visible').count() == 1
            assert page.locator(f'[data-preview="{app_id}"]').is_visible()
            about.focus()
            page.keyboard.press('Enter')
            assert page.locator('#app-dialog').is_visible()
            assert page.locator('#dialog-title').inner_text() == app['name']
            page.evaluate("""window.detailsClosed = false;
                document.querySelector('#app-dialog').addEventListener('close', () => {
                    window.detailsClosed = true;
                }, {once:true});""")
            page.keyboard.press('Escape')
            page.wait_for_function("window.detailsClosed && document.activeElement === document.querySelector('#showcase-about')")
        # Product selection works without a pointer, with one tab stop in the strip.
        page.locator('#showcase-tab-save').focus()
        for key, expected in [('ArrowRight', 'bond'), ('ArrowLeft', 'save'),
                              ('ArrowLeft', 'clock'), ('Home', 'save'), ('End', 'clock')]:
            page.keyboard.press(key)
            selected = page.locator(f'#showcase-tab-{expected}')
            assert selected.get_attribute('aria-selected') == 'true'
            assert selected.evaluate('e => document.activeElement === e')
            assert showcase_tabs.locator('[tabindex="0"]').count() == 1
        print('All five product previews, catalog links, app details and keyboard tabs passed.', flush=True)
        for width in [1440, 1024, 768, 600, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 900})
            for path in root.glob('*.html'):
                page.goto(f'{base_url}/{path.name}', wait_until='domcontentloaded')
                page.evaluate('document.fonts.ready')
                assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), (path.name, width)
                assert page.locator('main').count() == 1
                assert page.locator('h1').count() == 1
                assert page.locator('.site-footer .footer-col a').count() == 6
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
        page.locator('#navigation').get_by_role('link', name='Our apps', exact=True).click()
        assert not page.locator('#navigation').is_visible()
        assert page.locator('#apps').is_visible()
        no_js = browser.new_page(java_script_enabled=False)
        no_js.emulate_media(reduced_motion='reduce')
        no_js.goto(base_url, wait_until='domcontentloaded')
        assert no_js.get_by_role('heading', name='A little wonder. In your everyday.').is_visible()
        assert no_js.locator('#showcase-name').inner_text() == 'Save+'
        assert no_js.locator('#showcase-store').get_attribute('href') == catalog[0]['url']
        assert no_js.locator('.app-card').count() == 5
        assert no_js.locator('.app-card .app-feature-list li').count() == 15
        assert no_js.locator('a[href="about.html"]').first.is_visible()
        for app in catalog:
            no_js.locator(f'[data-world-app="{app["id"]}"]').click()
            no_js.wait_for_url(f'**/#app-{app["id"]}')
            assert no_js.locator(f'#app-{app["id"]}').is_visible()
        assert not errors, errors
        print('Mobile navigation and no-JavaScript content passed; no browser errors.', flush=True)
        browser.close()
finally:
    server.shutdown()
    server.server_close()
