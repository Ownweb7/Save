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

- Creator studio design across all pages: warm ivory and ink with tomato and lilac accents, expressive typography, and individual project posters for the existing app collection.
- Filterable app collection and keyboard-accessible app detail dialogs.
- Five working browser demos: editable savings goals with deposits and undo; a focus countdown; an impulse-purchase pause and savings estimate; a keyboard-enabled calculator; and a stopwatch with laps.
- Search by app name or feature, with category filters and a recoverable empty state.
- A compact, continuous scrolling layout with a pointer-reactive poster composition and canvas, moving type strip, rolling headings and project cards, rolling link labels, parallax artwork, and page transitions in supported browsers. Sections stay in normal document flow; wheel, touch and keyboard scrolling remain native. Motion respects system preferences and can be paused with a session-persistent control.
- Demos use temporary in-memory state. Refreshing clears it. They do not reproduce native Android app blocking, make purchases, or save personal data.
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
| `playground.js` | Five interactive browser demos |
| `styles.css` | Base layouts and browser demo styles |
| `studio.css` | Studio theme and responsive presentation |
| `studio.js` | Canvas, scroll effects, and motion control |
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

The regression checks cover all five demos, input validation, timer completion and pause/resume, calculator error recovery, app search, keyboard navigation, dialog focus, reactive poster composition and canvas, motion preferences, no-JavaScript content, and responsive layouts on every page.

With Python Playwright and Chromium available, run:

```sh
python tests/browser_smoke.py
python tests/studio_smoke.py
```

If needed, install the test tools with `python -m pip install playwright` and `python -m playwright install chromium`. They are only for testing; the website has no runtime dependencies.

The background caps pixel density and frame rate, pauses while the tab is hidden, and falls back to a still composition when motion is disabled. All content and navigation remain available without animations. The motion preference is stored only in session storage; app demo inputs are never persisted.
