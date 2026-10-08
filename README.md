# ODN & Sons — Company Website

The official publisher website for ODN & Sons, an independent mobile app studio established in 2022 and registered in Hisar, India.

## App collection

- **Save+** — saving goals and progress tracking.
- **Bond Time** — phone-free family time.
- **Will Impulse** — a pause before impulse food orders.
- **GlowCalc** — basic, scientific and tax calculators.
- **LockClock Aurum** — alarms, timers and stopwatch.

## Website

Plain HTML, CSS and vanilla JavaScript, with no runtime dependencies. A dependency-free Node script generates the five app pages during deployment.

- A cinematic homepage with original sci-fi artwork. Native scrolling moves from a full-screen sentinel into a visor close-up with working links to the app collection and studio. On mobile, the panoramic visor artwork sits above two full-width destination links. Portrait parallax, drifting embers, and a gold pointer halo respond to motion preferences.
- Antique gold, charcoal surfaces, and locally hosted serif typography carry through the studio, support, and policy pages.
- The header's **Background** submenu offers two thumbnail previews: War Sentinel and Anime Ravens. On mobile, open the navigation menu first. A choice updates the cinematic scenes and page backdrops, and is saved locally on the visitor's device across pages and visits. Returning visitors with retired Fantasy Portal, Battlefield, or Cyber Visor selections move to War Sentinel; Anime Eyes moves to Anime Ravens. The close-up artwork remains part of the two character themes' scrolling transitions.
- The eye navigation opens separate Apps and Studio pages. The Apps page opens directly onto a compact portfolio with three featured apps and two everyday utilities, circular app artwork, gold ornaments, and the selected cinematic background. Every medallion and app title opens its dedicated page, including without JavaScript.
- Search and category filters narrow the portfolio by name or feature, hiding empty groups. Each entry includes a short description and Google Play link. Each app has a shareable page with a split gallery and information layout, Overview/Functions/Details tabs, original uploaded images, privacy policy, support link, and previous/next app navigation. Galleries offer category filters, arrows, keyboard and touch navigation, and a full-screen image viewer. Selecting a function displays its image.
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
| `apps.html` | Searchable circular app portfolio in two groups |
| `save-plus.html`, `bond-time.html`, `will-impulse.html`, `glowcalc.html`, `lockclock-aurum.html` | Individual app pages |
| `about.html` | Illustrated studio portfolio, company story, approach, and contact banner |
| `contact.html` | Contact information and email composer |
| `privacy-policies.html` | General privacy policy |
| `*-privacy.html` | Individual app policies |
| `terms-and-conditions.html` | Terms and conditions |
| `apps.js` | App catalog used by search and page/policy navigation |
| `collection.css` | Compact app portfolio, circular artwork, ornaments, and responsive layouts |
| `app-pages.json` | App introductions, feature explanations, and image captions/categories |
| `app-pages.css`, `app-pages.js` | App page layouts, accessible tabs, galleries, and full-screen viewer |
| `scripts/build-app-pages.mjs` | Generates app page content from the catalog and uploaded images |
| `App Images/` | Original uploaded screenshots/posters, organized by exact app name |
| `main.js` | Shared interactions, app search, and legacy section-link redirects |
| `styles.css` | Base layouts and shared component styles |
| `studio.css` | Product preview and shared presentation |
| `cinema.css` | Cinematic scenes, gold theme, responsive artwork, and app/studio page layouts |
| `destinations.css` | Mobile homepage entrance and Studio portfolio layouts |
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

The existing `vercel.json` runs `node scripts/build-app-pages.mjs` and serves this folder as a static site with clean URLs. Follow the repository’s existing Git/Vercel deployment workflow. Generated HTML is also checked in, so the site can be served locally without running a build first.

## Update content

Edit shared app information in `apps.js` and detailed copy in `app-pages.json`, then run `node scripts/build-app-pages.mjs`. The generator replaces the main content of each app page, preserving the shared header/footer and page metadata. Keep the cards in `apps.html`, page metadata, and Studio page aligned. Keep store URLs and app-specific privacy links current. Company support is `support@allcreatormind.com`; individual policy contact details remain as originally published.

Upload PNG, JPG, WebP, or AVIF images into `App Images/<App Name>/` using the existing folder names. Numeric filename prefixes control display order. The next Vercel deployment automatically includes them; run the same build command to update local HTML. Add filename entries to `app-pages.json` for descriptive titles, function explanations, and categories. Unlisted images receive a filename-based caption. Originals are preserved and additional images load on demand. An empty folder uses the app's existing icon and brand artwork until screenshots are uploaded.

Fonts are served locally as WOFF2 files with system fallbacks; their licenses are included in `fonts/`. No analytics, account system, or server-side message processing is added.

## Browser checks

The regression checks cover cinematic navigation and responsive hit targets in portrait and landscape, opt-in sound, portfolio navigation, all five app pages and their store/detail destinations, catalog-aligned names and taglines, app search and empty-group recovery, keyboard navigation, legacy bookmark redirects, contact validation and email composition, clipboard support, FAQs, policy navigation, portrait parallax and canvas, motion preferences, no-JavaScript content, and responsive layouts on every page.

With Python Playwright and Chromium available, run:

```sh
python tests/browser_smoke.py
python tests/studio_smoke.py
python tests/background_smoke.py
python tests/app_gallery_smoke.py
```

If needed, install the test tools with `python -m pip install playwright` and `python -m playwright install chromium`. They are only for testing; the website has no runtime dependencies.

The wallpaper checks cover both themes, removal of retired choices, migration of saved preferences, keyboard selection, mobile and landscape layouts, dismissal and focus restoration, persistence across all pages and reloads, reduced motion, slow or failed downloads, and unavailable storage. Only the most recent selection is applied when downloads overlap; a failed download preserves the previous wallpaper.

The app gallery checks cover original image paths and lazy loading, function links, accessible tabs, image categories, keyboard navigation, full-screen zoom and focus restoration, touch swipes, mobile panning, slow or failed image requests, and access to every original image without JavaScript. All five layouts and viewers are checked at six desktop, tablet, mobile, and landscape sizes.

The background caps pixel density and frame rate, pauses while the tab is hidden, and falls back to a still composition when motion is disabled. All content and navigation remain available without animations. The motion preference is stored only in session storage; the wallpaper ID uses local storage (`odn-background-theme`). Contact messages are never stored on the website.
