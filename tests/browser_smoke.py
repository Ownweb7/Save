"""Browser regression checks. Run: python tests/browser_smoke.py.
Requires Playwright for Python and Chromium (system or Playwright-installed).
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import shutil

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

root = Path(__file__).resolve().parents[1]
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(root)))
Thread(target=server.serve_forever, daemon=True).start()
base_url = f'http://127.0.0.1:{server.server_port}'
try:
    from playwright.sync_api import sync_playwright
    from datetime import datetime, timezone
    with sync_playwright() as p:
     browser=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox'])
     page=browser.new_page(viewport={'width':1440,'height':1100})
     errors=[]
     page.on('pageerror',lambda e: errors.append(str(e)))
     page.clock.install(time=datetime(2026, 10, 8, tzinfo=timezone.utc))
     page.clock.pause_at(datetime(2026, 10, 8, 0, 0, 1, tzinfo=timezone.utc))
     page.emulate_media(reduced_motion='reduce')
     page.goto(base_url,wait_until='domcontentloaded')
     # Saving goal arithmetic, editable forecast, undo, reset and invalid values.
     page.locator('#demo-deposit').fill('7500')
     page.locator('#demo-deposit-form button').click()
     assert page.locator('#demo-saved').inner_text()=='₹20,000'
     assert '6 months' in page.locator('#demo-forecast').inner_text()
     page.locator('#demo-undo').click()
     assert page.locator('#demo-saved').inner_text()=='₹12,500'
     page.locator('#demo-target').fill('10000')
     assert 'Goal reached' in page.locator('#demo-remaining').inner_text()
     assert page.locator('.demo-progress').get_attribute('aria-valuenow')=='100'
     page.locator('#demo-monthly').fill('0')
     assert 'Enter a whole amount' in page.locator('#demo-forecast').inner_text()
     page.locator('#demo-save-reset').click()
     assert page.locator('#demo-undo').is_disabled()
     # Tabs support arrows and display only one panel.
     page.locator('#tab-save').focus();page.keyboard.press('ArrowRight')
     assert page.locator('#tab-bond').get_attribute('aria-selected')=='true'
     assert page.locator('.demo-panel:visible').count()==1
     page.locator('#focus-start').click();page.clock.fast_forward(10000)
     assert page.locator('#focus-time').inner_text()=='00:50'
     page.locator('#focus-start').click();page.clock.fast_forward(10000)
     assert page.locator('#focus-time').inner_text()=='00:50'
     page.locator('#focus-start').click()
     page.locator('#tab-save').click();page.clock.fast_forward(50001)
     page.locator('#tab-bond').click()
     assert page.locator('#focus-time').inner_text()=='00:00'
     assert 'Session complete' in page.locator('#focus-status').inner_text()
     page.locator('[data-duration="300"]').click()
     assert page.locator('#focus-time').inner_text()=='05:00'
     # Pause exercise unlocks at the deadline, and choices never trigger orders.
     page.locator('#tab-will').click()
     page.locator('#impulse-cost').fill('500');page.locator('#impulse-count').fill('3')
     assert page.locator('#impulse-total').inner_text()=='₹78,000'
     page.locator('#impulse-start').click()
     assert page.locator('#impulse-skip').is_disabled()
     page.clock.fast_forward(5001)
     assert page.locator('#impulse-skip').is_enabled()
     page.locator('#impulse-skip').click()
     assert 'You chose to skip' in page.locator('#impulse-status').inner_text()
     page.locator('#impulse-start').click();page.clock.fast_forward(5001);page.locator('#impulse-continue').click()
     assert 'does not place an order' in page.locator('#impulse-status').inner_text()
     # Calculator keyboard, chained operations, decimals, error recovery and colour.
     page.locator('#tab-glow').click();page.locator('#demo-glow').focus()
     page.keyboard.type('12.5+7.5=')
     assert page.locator('#calc-result').inner_text()=='20'
     page.keyboard.press('Escape');page.keyboard.type('8/0=')
     assert page.locator('#calc-result').inner_text()=='Error'
     page.keyboard.type('9*9=')
     assert page.locator('#calc-result').inner_text()=='81'
     page.keyboard.press('Escape');page.keyboard.type('2+3*4=')
     assert page.locator('#calc-result').inner_text()=='20' # simple sequential calculator
     page.keyboard.press('Escape');page.keyboard.type('0.1+0.2=')
     assert page.locator('#calc-result').inner_text()=='0.3'
     page.locator('[data-neon="#7de3e0"]').click()
     assert page.locator('#calculator').evaluate("e=>e.style.getPropertyValue('--neon')")=='#7de3e0'
     # Stopwatch includes hidden-tab time, pauses cleanly, records and clears laps.
     page.locator('#tab-clock').click();page.locator('#stopwatch-start').click();page.clock.fast_forward(2500)
     assert page.locator('#stopwatch-time').inner_text()=='00:02.50'
     page.locator('#stopwatch-lap').click()
     assert page.locator('#stopwatch-laps li').count()==1
     page.locator('#stopwatch-start').click();page.clock.fast_forward(2000)
     assert page.locator('#stopwatch-time').inner_text()=='00:02.50'
     page.locator('#stopwatch-start').click();page.locator('#tab-save').click();page.clock.fast_forward(1500)
     page.locator('#tab-clock').click();page.clock.fast_forward(50)
     assert page.locator('#stopwatch-time').inner_text()=='00:04.05'
     page.locator('#stopwatch-reset').click()
     assert page.locator('#stopwatch-laps li').count()==0
     assert page.locator('#stopwatch-time').inner_text()=='00:00.00'
     # Search and category filters combine; empty state resets both.
     page.locator('#app-search').fill('scientific')
     assert page.locator('.app-card:visible').count()==1
     assert 'GlowCalc' in page.locator('.app-card:visible').inner_text()
     page.locator('[data-filter="Money"]').click()
     assert page.locator('#search-empty').is_visible()
     page.locator('#reset-search').click()
     assert page.locator('.app-card:visible').count()==5
     # Both card and dialog deep actions land on their demo with correct focus.
     page.locator('[data-try="bond"]').first.click()
     assert page.locator('#tab-bond').get_attribute('aria-selected')=='true'
     page.locator('.app-art[data-app="clock"]').click()
     page.locator('dialog [data-try="clock"]').click()
     page.clock.fast_forward(200)
     assert not page.locator('dialog').is_visible()
     assert page.locator('#tab-clock').evaluate('e=>e===document.activeElement')
     # Reopen and close a normal dialog after using the demo action.
     page.locator('.app-art[data-app="glow"]').click();page.keyboard.press('Escape');page.clock.fast_forward(100)
     assert page.locator('.app-art[data-app="glow"]').evaluate('e=>e===document.activeElement')
     for width in [1440,768,390,320]:
      page.set_viewport_size({'width':width,'height':1000})
      for demo in ['save','bond','will','glow','clock']:
       page.locator('#tab-'+demo).click()
       assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),f'Overflow at {width}: {demo}'
      print('All five demos fit width',width,flush=True)
     page.set_viewport_size({'width':1440,'height':1100});page.locator('#tab-save').click()
     page.evaluate('window.scrollTo(0,0)');page.clock.fast_forward(1000)
     assert not errors,errors
     print('Five demo journeys, keyboard controls, invalid input, hidden-tab timing and search passed. No browser errors.',flush=True)
     browser.close()
finally:
    server.shutdown()
    server.server_close()
