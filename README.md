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

- A cinematic homepage with original sci-fi artwork. Native scrolling moves from a full-screen sentinel into a visor close-up with working links to the app collection and studio. On mobile, the panoramic visor artwork sits above two full-width destination links. Portrait parallax, drifting embers, and a gold pointer halo respond to motion preferences.
- Antique gold, charcoal surfaces, and locally hosted serif typography carry through the studio, support, and policy pages.
- The header's **Background** submenu offers two thumbnail previews: War Sentinel and Anime Ravens. On mobile, open the navigation menu first. A choice updates the cinematic scenes and page backdrops, and is saved locally on the visitor's device across pages and visits. Returning visitors with retired Fantasy Portal, Battlefield, or Cyber Visor selections move to War Sentinel; Anime Eyes moves to Anime Ravens. The close-up artwork remains part of the two character themes' scrolling transitions.
- The eye navigation opens separate Apps and Studio pages. The animated portal scene opens the Apps page; all five app links lead to dedicated pages, including without JavaScript. The Apps page includes compact, searchable cards with Google Play destinations.
- Compact, filterable app cards with descriptions, feature chips, Google Play links and privacy policies. Each app has a shareable page with its description, features, preview, privacy policy, support link, and previous/next app navigation.
- Search by app name or feature, category filters, and a recoverable empty state.
- Optional ambient audio synthesized locally with Web Audio. Sound starts only after an explicit click and pauses while the page is hidden. No audio downloads or autoplay.
- Scroll and pointer effects respect reduced motion and the session-persistent motion control. All sections retain native wheel, touch and keyboard scrolling.
- The Studio page follows an illustrated portfolio layout with circular app medallions, gold dividers, our approach, company information, and a compact contact banner. Every secondary page has a footer; the homepage contains only the portrait and destination scenes. The header stays transparent.
- Privacy-policy selector and section navigation. Existing policy text is preserved.
- Contact composer that opens the visitor’s email client or Gmail. It does not send or store messages itself.
- Copy-email control, FAQ accordions, mobile navigation and reduced-motion support.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Cinematic portrait and responsive destination scene |
| `apps.html` | Animated portal entrance and searchable app collection |
| `save-plus.html`, `bond-time.html`, `will-impulse.html`, `glowcalc.html`, `lockclock-aurum.html` | Individual app pages |
| `about.html` | Illustrated studio portfolio, company story, approach, and contact banner |
| `contact.html` | Contact information and email composer |
| `privacy-policies.html` | General privacy policy |
| `*-privacy.html` | Individual app policies |
| `terms-and-conditions.html` | Terms and conditions |
| `apps.js` | App catalog used by search and page/policy navigation |
| `main.js` | Shared interactions, app search, and legacy section-link redirects |
| `styles.css` | Base layouts and shared component styles |
| `studio.css` | Product preview and shared presentation |
| `cinema.css` | Cinematic scenes, gold theme, responsive artwork, and app/studio page layouts |
| `destinations.css` | Mobile entrance, Apps portal, and Studio portfolio layouts |
| `cinema.js` | Scroll chapters, eye navigation, pointer effects and optional ambient audio |
| `backgrounds.js`, `backgrounds.css` | Accessible wallpaper picker, image loading, responsive submenu, and local preference |
| `art/` | Two main wallpapers and two scroll-transition close-ups, optimized as WebP |
| `art/thumbnails/` | Two small wallpaper previews; full artwork loads only when needed |
| `studio.js` | Product pointer effects, canvas, scroll effects, and motion control |
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

The regression checks cover cinematic navigation and responsive hit targets in portrait and landscape, opt-in sound, portal page navigation, all five product previews and their store/detail destinations, catalog-aligned feature chips, app search, keyboard navigation, legacy bookmark redirects, contact validation and email composition, clipboard support, FAQs, policy navigation, portrait parallax, phone composition and canvas, motion preferences, no-JavaScript content, and responsive layouts on every page. Phone previews are checked for all five apps at six widths.

With Python Playwright and Chromium available, run:

```sh
python tests/browser_smoke.py
python tests/studio_smoke.py
python tests/background_smoke.py
```

If needed, install the test tools with `python -m pip install playwright` and `python -m playwright install chromium`. They are only for testing; the website has no runtime dependencies.

The wallpaper checks cover both themes, removal of retired choices, migration of saved preferences, keyboard selection, mobile and landscape layouts, dismissal and focus restoration, persistence across all pages and reloads, reduced motion, slow or failed downloads, and unavailable storage. Only the most recent selection is applied when downloads overlap; a failed download preserves the previous wallpaper.

The background caps pixel density and frame rate, pauses while the tab is hidden, and falls back to a still composition when motion is disabled. All content and navigation remain available without animations. The motion preference is stored only in session storage; the wallpaper ID uses local storage (`odn-background-theme`). Contact messages are never stored on the website.
