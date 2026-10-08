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

- An original immersive app studio homepage with a chrome and lavender orb, a pointer-reactive eye, and five floating app links. These select a product preview with JavaScript and lead directly to the app cards without it. Dark graphite surfaces, clear product information, and consistent styling carry through the studio, support, and policy pages.
- Interactive product previews below the hero for all five apps, with keyboard-accessible tabs, matching Google Play links, and direct access to app details. Phone previews show illustrative sample content.
- Compact, filterable app collection with three columns on desktop, two on tablets, and one on narrow screens. Each card keeps a clear description, three feature chips, a full-width Google Play control, app details, and its privacy policy.
- Search by app name or feature, with category filters and a recoverable empty state.
- A compact, fully scrollable layout with a pointer-reactive phone composition and interactive sci-fi canvas, moving type strip, rolling headings and product cards, rolling link labels, parallax artwork, and page transitions in supported browsers. Product cards use subtle grid artwork, illuminated corners, pointer-reactive glow, and a single scan transition on hover or keyboard focus. Sections stay in normal document flow; wheel, touch and keyboard scrolling remain native. Motion respects system preferences and can be paused with a session-persistent control.
- A compact contact banner and footer keep support, app navigation, and policy links easy to find.
- Privacy-policy selector and section navigation. Existing policy text is preserved.
- Contact composer that opens the visitor’s email client or Gmail. It does not send or store messages itself.
- Copy-email control, FAQ accordions, mobile navigation and reduced-motion support.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Homepage and app collection |
| `about.html` | Studio story and app descriptions |
| `contact.html` | Contact information and email composer |
| `privacy-policies.html` | General privacy policy |
| `*-privacy.html` | Individual app policies |
| `terms-and-conditions.html` | Terms and conditions |
| `apps.js` | App details used by interactive dialogs and policy navigation |
| `main.js` | Shared interactions and app search |
| `styles.css` | Base layouts and shared component styles |
| `studio.css` | Studio theme and responsive presentation |
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

When editing app information, keep the static homepage cards, `apps.js`, and About page aligned. Keep store URLs and app-specific privacy links current. Company support is `support@allcreatormind.com`; individual policy contact details remain as originally published.

Fonts are served locally as WOFF2 files with system fallbacks; their licenses are included in `fonts/`. No analytics, account system, or server-side message processing is added.

## Browser checks

The regression checks cover floating app selection, all five product previews and their store/detail destinations, catalog-aligned feature chips, app search, keyboard navigation, dialog focus, contact validation and email composition, clipboard support, FAQs, policy navigation, reactive scene, phone composition and canvas, motion preferences, no-JavaScript content, and responsive layouts on every page. Phone previews are checked for all five apps at six widths.

With Python Playwright and Chromium available, run:

```sh
python tests/browser_smoke.py
python tests/studio_smoke.py
```

If needed, install the test tools with `python -m pip install playwright` and `python -m playwright install chromium`. They are only for testing; the website has no runtime dependencies.

The background caps pixel density and frame rate, pauses while the tab is hidden, and falls back to a still composition when motion is disabled. All content and navigation remain available without animations. The motion preference is stored only in session storage; contact messages are never stored on the website.
