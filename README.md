# ODN & Sons — Company Website

The official publisher website for ODN & Sons, an independent mobile app studio established in 2022 and registered in Hisar, India.

## App collection

- **Save+** — saving goals and progress tracking.
- **Bond Time** — phone-free family time.
- **Will Impulse** — a pause before impulse food orders.
- **GlowCalc** — basic, scientific and tax calculators.
- **LockClock Aurum** — alarms, timers and stopwatch.

## Website

Plain HTML, CSS and vanilla JavaScript. No build step or runtime dependencies.

- A cinematic illustrated homepage with original raven, portrait, and portal artwork. Native scrolling moves from a full-screen portrait into an eye close-up with working links to the app collection and studio. Portrait parallax, drifting feathers, a gold pointer halo, and orbit details respond to motion preferences.
- Antique gold, charcoal surfaces, and locally hosted serif typography carry through the studio, support, and policy pages.
- The eye navigation opens separate Apps and Studio pages. Each portal app link opens its own detail page, including without JavaScript. The Apps page includes keyboard-accessible preview tabs and Google Play destinations.
- Compact, filterable app cards with descriptions, feature chips, Google Play links and privacy policies. Each app has a shareable page with its description, features, preview, privacy policy, support link, and previous/next app navigation.
- Search by app name or feature, category filters, and a recoverable empty state.
- Optional ambient audio synthesized locally with Web Audio. Sound starts only after an explicit click and pauses while the page is hidden. No audio downloads or autoplay.
- Scroll and pointer effects respect reduced motion and the session-persistent motion control. All sections retain native wheel, touch and keyboard scrolling.
- Company information, our approach, and a compact contact banner live on the Studio page. Every secondary page has a footer; the homepage contains only the three illustrated scenes. The header stays transparent.
- Privacy-policy selector and section navigation. Existing policy text is preserved.
- Contact composer that opens the visitor’s email client or Gmail. It does not send or store messages itself.
- Copy-email control, FAQ accordions, mobile navigation and reduced-motion support.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Three cinematic homepage scenes |
| `apps.html` | Searchable app collection and interactive previews |
| `save-plus.html`, `bond-time.html`, `will-impulse.html`, `glowcalc.html`, `lockclock-aurum.html` | Individual app pages |
| `about.html` | Company information, app descriptions, approach, and contact banner |
| `contact.html` | Contact information and email composer |
| `privacy-policies.html` | General privacy policy |
| `*-privacy.html` | Individual app policies |
| `terms-and-conditions.html` | Terms and conditions |
| `apps.js` | App catalog used by search, previews, and page/policy navigation |
| `main.js` | Shared interactions, app search, and legacy section-link redirects |
| `styles.css` | Base layouts and shared component styles |
| `studio.css` | Product preview and shared presentation |
| `cinema.css` | Cinematic scenes, gold theme, responsive artwork, and app/studio page layouts |
| `cinema.js` | Scroll chapters, eye navigation, pointer effects and optional ambient audio |
| `art/` | Three original generated illustrations, optimized as WebP (under 1 MiB combined) |
| `studio.js` | Product preview selector, canvas, scroll effects, and motion control |
| `icons/` | Existing app artwork |
| `fonts/` | Locally hosted WOFF2 typefaces and their licenses |

## Run locally

Open `index.html`, or serve the folder:

```sh
python -m http.server 3000
```

Visit `http://localhost:3000`. An HTTP server enables more reliable browser features than opening files directly; clipboard support also depends on browser permissions and a secure context.

## Deploy

The existing `vercel.json` serves this folder as a static site with clean URLs. No build command is needed. Follow the repository’s existing Git/Vercel deployment workflow.

## Update content

When editing app information, keep the cards in `apps.html`, individual app pages, `apps.js`, and Studio page aligned. Keep store URLs and app-specific privacy links current. Company support is `support@allcreatormind.com`; individual policy contact details remain as originally published.

Fonts are served locally as WOFF2 files with system fallbacks; their licenses are included in `fonts/`. No analytics, account system, or server-side message processing is added.

## Browser checks

The regression checks cover cinematic eye navigation and responsive hit targets, opt-in sound, portal page navigation, all five product previews and their store/detail destinations, catalog-aligned feature chips, app search, keyboard navigation, legacy bookmark redirects, contact validation and email composition, clipboard support, FAQs, policy navigation, portrait parallax, phone composition and canvas, motion preferences, no-JavaScript content, and responsive layouts on every page. Phone previews are checked for all five apps at six widths.

With Python Playwright and Chromium available, run:

```sh
python tests/browser_smoke.py
python tests/studio_smoke.py
```

If needed, install the test tools with `python -m pip install playwright` and `python -m playwright install chromium`. They are only for testing; the website has no runtime dependencies.

The background caps pixel density and frame rate, pauses while the tab is hidden, and falls back to a still composition when motion is disabled. All content and navigation remain available without animations. The motion preference is stored only in session storage; contact messages are never stored on the website.
