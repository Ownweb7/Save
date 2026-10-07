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

- Responsive charcoal-and-gold design across all pages.
- Filterable app collection and keyboard-accessible app detail dialogs.
- Interactive savings illustration on the homepage; sample amounts are for the web preview only and are not stored.
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
| `main.js` | Shared interactions |
| `styles.css` | Shared design and responsive layouts |
| `icons/` | Existing app artwork |

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

Fonts use Google Fonts with system fallbacks. No analytics, account system, or server-side message processing is added.
