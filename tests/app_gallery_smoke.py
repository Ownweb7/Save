"""App case-study journeys: uploaded images, filters, viewer, tabs and mobile gestures."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import unquote, urlparse
import json
import shutil
from playwright.sync_api import sync_playwright, expect


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


root = Path(__file__).resolve().parents[1]
catalog = json.loads((root/'apps.js').read_text().split('=',1)[1].strip().rstrip(';'))
server = ThreadingHTTPServer(('127.0.0.1',0), partial(QuietHandler,directory=str(root)))
Thread(target=server.serve_forever,daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}'
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        requests=[]
        page.on('request',lambda r:requests.append(unquote(urlparse(r.url).path)))

        def current(index):
            expect(page.locator('.gallery-slide').nth(index)).to_be_visible()
            expect(page.locator('.gallery-slide:not([hidden])')).to_have_count(1)
            expect(page.locator('.gallery-viewport')).not_to_have_attribute('aria-busy','true')
            assert page.locator('.gallery-slide').nth(index).locator('img').evaluate('e=>e.complete && e.naturalWidth===800')

        for app in catalog:
            requests.clear()
            page.goto(f'{base}/{app["page"]}',wait_until='networkidle')
            expect(page.locator('h1')).to_have_text(app['name'])
            expect(page.get_by_role('tabpanel',name='Overview')).to_be_visible()
            assert page.locator('.product-feature-grid h3').all_text_contents()==app['features']
            assert page.locator('.product-store').get_attribute('href')==app['url']
            assert page.locator('.product-policy').get_attribute('href')==app['policy']
            files=sorted((root/'App Images'/app['name']).glob('*.png'))
            assert page.locator('.gallery-slide').count()==len(files)
            if files:
                # Hidden screenshots are not downloaded just to render navigation.
                assert len(set(r for r in requests if r.startswith('/App Images/')))==1, requests
                for i,path in enumerate(files):
                    page.locator(f'[data-gallery-index="{i}"]').click()
                    current(i)
                    src=unquote(page.locator('.gallery-slide').nth(i).locator('img').get_attribute('src'))
                    assert src==str(path.relative_to(root)),src
                page.get_by_role('tab',name='Functions',exact=True).click()
                expect(page.locator('#functions')).to_be_visible()
                page.locator('[data-show-screen="0"]').click()
                current(0)
            else:
                expect(page.locator('.gallery-brand')).to_be_visible()
                assert page.locator('.gallery-brand img').evaluate('e=>e.complete && e.naturalWidth>0')
                assert page.locator('.gallery-arrows,.gallery-lightbox').count()==0
            page.get_by_role('tab',name='Overview',exact=True).focus()
            page.keyboard.press('End')
            expect(page.get_by_role('tab',name='Details',exact=True)).to_be_focused()
            expect(page.locator('#details')).to_be_visible()
            expect(page.locator('#overview')).to_be_hidden()
            assert page.locator('#details a[href="contact.html"]').is_visible()
        print('All five pages: app content, 32 uploaded images, lazy loading, function links and accessible tabs passed.',flush=True)

        page.goto(f'{base}/save-plus.html',wait_until='networkidle')
        page.get_by_role('button',name='Appearance',exact=True).click()
        current(7)
        expect(page.locator('.gallery-count')).to_have_text('01 / 01')
        expect(page.locator('.gallery-arrows [data-gallery-next]')).to_be_disabled()
        assert page.locator('[data-gallery-index]:visible').count()==1
        page.get_by_role('tab',name='Functions',exact=True).click()
        page.locator('[data-show-screen="3"]').click()
        current(3)
        expect(page.get_by_role('button',name='All screens',exact=True)).to_have_attribute('aria-pressed','true')
        page.locator('.gallery-expand').click()
        expect(page.get_by_role('dialog')).to_be_visible()
        expect(page.get_by_role('button',name='Close image viewer')).to_be_focused()
        page.get_by_role('button',name='Actual size',exact=True).click()
        assert page.locator('.lightbox-stage img').bounding_box()['width']==800
        page.get_by_role('button',name='Fit to screen',exact=True).click()
        page.keyboard.press('ArrowRight')
        current(4)
        expect(page.locator('.lightbox-caption')).to_contain_text('Monthly top-ups')
        page.keyboard.press('Escape')
        expect(page.get_by_role('dialog')).to_be_hidden()
        expect(page.locator('.gallery-slide:not([hidden]) .gallery-open')).to_be_focused()
        assert page.evaluate('document.body.style.overflow')==''
        page.locator('.gallery-viewport').focus()
        page.keyboard.press('Home')
        current(0)
        page.keyboard.press('ArrowLeft')
        current(7)
        print('Image categories, single-image filters, fullscreen zoom, Escape/focus and keyboard wraparound passed.',flush=True)

        for width,height in [(1920,1080),(1024,800),(768,900),(390,844),(320,667),(844,390)]:
            page.set_viewport_size({'width':width,'height':height})
            for app in catalog:
                page.goto(f'{base}/{app["page"]}',wait_until='domcontentloaded')
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),(width,app['id'])
                if page.locator('.gallery-open').count():
                    assert page.locator('.gallery-open img').first.evaluate('e=>getComputedStyle(e).objectFit')=='contain'
                    page.locator('.gallery-expand').click()
                    expect(page.get_by_role('dialog')).to_be_visible()
                    assert page.locator('.lightbox-stage').evaluate('e=>e.clientWidth<=innerWidth')
                    page.keyboard.press('Escape')
            print(f'All app layouts and viewers fit {width}×{height}.',flush=True)

        mobile=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
        mobile.on('pageerror',lambda e:errors.append(str(e)))
        mobile.goto(f'{base}/save-plus.html',wait_until='networkidle')
        mobile.locator('.gallery-viewport').scroll_into_view_if_needed()
        b=mobile.locator('.gallery-viewport').bounding_box()
        client=mobile.context.new_cdp_session(mobile)
        y=b['y']+b['height']*.45
        x=b['x']+b['width']*.8
        client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
        for fraction in [.65,.5,.35,.2]:
            client.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':b['x']+b['width']*fraction,'y':y}]})
        client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        expect(mobile.locator('#gallery-caption')).to_have_text('Your monthly plan')
        mobile.touchscreen.tap(b['x']+b['width']*.5,y)
        expect(mobile.get_by_role('dialog')).to_be_visible()
        mobile.get_by_role('button',name='Actual size',exact=True).click()
        assert mobile.locator('.lightbox-stage').evaluate('e=>e.scrollWidth>e.clientWidth')
        mobile.get_by_role('button',name='Close image viewer').click()
        mobile.close()
        print('Real touch swipe, tap-to-open and mobile full-size panning passed.',flush=True)

        page.close()
        page=browser.new_page(viewport={'width':1440,'height':1000})
        page.on('pageerror',lambda e:errors.append(str(e)))
        pending=[]
        page.route('**/02-monthly-plan.png',lambda route:pending.append(route))
        page.goto(f'{base}/save-plus.html',wait_until='networkidle')
        page.locator('.gallery-arrows [data-gallery-next]').click()
        expect(page.locator('.gallery-status')).to_contain_text('Loading')
        page.locator('[data-gallery-index="7"]').click()
        current(7)
        with page.expect_response('**/02-monthly-plan.png'):
            pending.pop().continue_()
        page.wait_for_load_state('networkidle')
        current(7)
        page.route('**/03-what-if-planner.png',lambda route:route.abort())
        page.locator('[data-gallery-index="2"]').click()
        expect(page.locator('.gallery-status')).to_contain_text('could not load')
        current(7)
        print('Slow image races and failed downloads preserve the latest usable image.',flush=True)

        nojs=browser.new_page(java_script_enabled=False,reduced_motion='reduce')
        nojs.goto(f'{base}/save-plus.html',wait_until='networkidle')
        assert nojs.locator('.gallery-originals a').count()==8
        expect(nojs.locator('#overview')).to_be_visible()
        expect(nojs.locator('#functions')).to_be_visible()
        expect(nojs.locator('#details')).to_be_visible()
        with nojs.expect_popup() as popup:
            nojs.locator('.gallery-originals a').nth(1).click()
        popup.value.wait_for_load_state()
        assert '02-monthly-plan.png' in popup.value.url
        assert not errors,errors
        print('No-JavaScript access to all app information and original images passed; no browser errors.',flush=True)
        browser.close()
finally:
    server.shutdown()
    server.server_close()
