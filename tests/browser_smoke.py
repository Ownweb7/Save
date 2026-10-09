"""Browser journeys for the app catalog, details and shared support pages.
Run: python tests/browser_smoke.py (requires Python Playwright and Chromium).
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import parse_qs, urlparse
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
        context = browser.new_context(viewport={'width': 1440, 'height': 1000},
                                      permissions=['clipboard-read', 'clipboard-write'])
        page = context.new_page()
        page.emulate_media(reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(f'{base_url}/apps.html', wait_until='domcontentloaded')
        catalog = page.evaluate('window.ODN_APPS')

        # All five apps share one list; categories and the old grouped layout are gone.
        assert page.locator('h1').inner_text() == 'Our apps'
        assert page.locator('.studio-projects').count() == 1
        assert page.locator('.studio-projects > li:visible').count() == 5
        assert page.locator('[data-filter],[data-category],[data-app-group],#app-search').count() == 0
        assert 'Featured apps' not in page.locator('main').inner_text()
        assert 'Everyday utilities' not in page.locator('main').inner_text()

        # Cards navigate to persistent app pages, with matching content and destinations.
        for app in catalog:
            card = page.locator(f'#app-{app["id"]}')
            assert card.locator('h2').inner_text() == app['name']
            card.locator('.studio-project').click()
            page.wait_for_url(f'**/{app["page"]}')
            assert page.locator('h1').inner_text() == app['name']
            assert page.locator('.product-description').inner_text() == app['desc']
            assert page.locator('.product-feature-grid h3').all_text_contents() == app['features']
            assert page.locator('.product-store').get_attribute('href') == app['url']
            assert page.locator('.product-policy').get_attribute('href') == app['policy']
            assert page.locator('.site-footer').count() == 1
            page.locator('.product-back').click()
            page.wait_for_url('**/apps.html')
        page.get_by_role('link', name='Explore Save+', exact=True).first.focus()
        page.keyboard.press('Enter')
        page.wait_for_url('**/save-plus.html')
        assert page.locator('h1').inner_text() == 'Save+'
        # Next/previous links visit complete pages; browser Back remains useful.
        page.locator('.product-pagination a').last.click()
        page.wait_for_url('**/bond-time.html')
        page.go_back(wait_until='domcontentloaded')
        assert page.locator('h1').inner_text() == 'Save+'
        page.locator('.product-policy').click()
        page.wait_for_url('**/save-plus-privacy.html')
        print('One app list, five dedicated app pages and keyboard navigation passed.', flush=True)

        # Studio retains the company information, with its showcase moved to Our Apps.
        page.goto(f'{base_url}/about.html', wait_until='domcontentloaded')
        assert page.locator('#selected-work,.studio-projects,.studio-collection-link').count() == 0
        assert 'Selected work' not in page.locator('main').inner_text()
        assert 'THE APP COLLECTION' not in page.locator('main').inner_text()
        for app in catalog:
            assert page.locator(f'main a[href="{app["page"]}"]').count() == 0
        assert page.locator('#approach,#our-story,.studio-contact').count() == 3
        page.locator('#navigation').get_by_role('link', name='Our apps', exact=True).click()
        page.wait_for_url('**/apps.html')
        assert page.locator('.studio-projects a').count() == 5

        # Contact composition produces a correctly encoded message without sending it.
        page.goto(f'{base_url}/contact.html', wait_until='domcontentloaded')
        page.locator('#copyEmail').click()
        page.wait_for_function('document.querySelector("#toast").textContent === "Email address copied."')
        assert page.evaluate('navigator.clipboard.readText()') == 'support@allcreatormind.com'
        page.locator('#contact-form button[type="submit"]').click()
        assert not page.locator('#contact-message').evaluate('e => e.checkValidity()')
        page.locator('#contact-app').select_option(label='GlowCalc')
        page.locator('#contact-topic').select_option(label='Report an issue')
        message = 'Calculator history & keyboard issue on Android 14.'
        subject = 'GlowCalc — Report an issue'
        page.locator('#contact-message').fill(message)
        gmail = parse_qs(urlparse(page.locator('#gmail-link').get_attribute('href')).query)
        assert gmail['to'] == ['support@allcreatormind.com']
        assert gmail['su'] == [subject] and gmail['body'] == [message]
        page.evaluate("""document.addEventListener('click', event => {
            const link = event.target.closest('a[href^="mailto:"]');
            if (link) { event.preventDefault(); window.composedEmail = link.href; }
        }, {capture:true});""")
        page.locator('#contact-form button[type="submit"]').click()
        composed = urlparse(page.evaluate('window.composedEmail'))
        assert composed.path == 'support@allcreatormind.com'
        values = parse_qs(composed.query)
        assert values['subject'] == [subject] and values['body'] == [message]
        assert 'Continue in your email app' in page.locator('#contact-status').inner_text()
        summary = page.locator('.faqs summary').first
        summary.click()
        assert page.locator('.faqs details').first.locator('p').is_visible()
        summary.click()
        assert not page.locator('.faqs details').first.locator('p').is_visible()

        # The policy selector reaches each app's published policy and preserves its selection.
        for app in catalog:
            page.goto(f'{base_url}/privacy-policies.html', wait_until='domcontentloaded')
            page.locator('#policy-select').select_option(app['policy'])
            page.wait_for_url(f'**/{app["policy"]}')
            assert page.locator('#policy-select').input_value() == app['policy']
            assert app['name'] in page.title()
        print('Clipboard, contact validation/composition, FAQ and five policy destinations passed.', flush=True)

        for width in [1440, 768, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 1000})
            page.goto(f'{base_url}/apps.html', wait_until='domcontentloaded')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
            assert page.locator('.studio-projects > li:visible').count() == 5
            if width <= 760:
                menu = page.get_by_role('button', name='Open navigation')
                menu.click()
                assert page.locator('#navigation').is_visible()
                page.keyboard.press('Escape')
                assert not page.locator('#navigation').is_visible()
                assert menu.evaluate('e => document.activeElement === e')
            for app in catalog:
                page.goto(f'{base_url}/{app["page"]}', wait_until='domcontentloaded')
                assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), (width, app['id'])
                assert page.locator('.product-store').is_visible()
                assert page.locator('.product-back').is_visible()
            print(f'All app pages fit {width}px.', flush=True)
        for path in root.glob('*.html'):
            page.goto(f'{base_url}/{path.name}', wait_until='domcontentloaded')
            missing = page.locator('a[href^="#"]').evaluate_all("""links => links.map(a => a.getAttribute('href'))
                .filter(href => href.length > 1 && !document.getElementById(href.slice(1)))""")
            assert not missing, (path.name, missing)
        # Shared bookmarks from the former one-page layout reach their new destinations.
        for fragment, destination in [('apps', 'apps.html'), ('app-preview', 'apps.html#apps'),
                                      ('creative-world', 'apps.html'),
                                      ('studio-intro', 'about.html'), ('approach', 'about.html#approach')]:
            page.goto(f'{base_url}/?v=old#{fragment}', wait_until='domcontentloaded')
            page.wait_for_url(f'**/{destination}')
        for app in catalog:
            page.goto(f'{base_url}/#app-{app["id"]}', wait_until='domcontentloaded')
            page.wait_for_url(f'**/{app["page"]}')
        assert not errors, errors
        print('Shared mobile navigation, local section links and browser errors passed.', flush=True)
        browser.close()
finally:
    server.shutdown()
    server.server_close()
