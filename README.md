# ODN & Sons — Company Website

A premium, lightweight website for **ODN & Sons**, the shared home for all of our mobile apps (present and future).

- **Established:** 2022
- **Registered in:** Hisar, India
- **Style:** Premium / luxury, dark theme with gold accents
- **Stack:** Plain HTML + CSS + a tiny bit of vanilla JS — no build step, no framework, no complications.

## Pages
| Page | File |
|------|------|
| Home | `index.html` |
| About Us | `about.html` |
| Privacy Policy (common) | `privacy-policy.html` |
| Terms & Conditions (common) | `terms-and-conditions.html` |
| Contact (email only) | `contact.html` |

The privacy policy and terms apply to **every** ODN & Sons app.

## Run locally
Just open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Deploy (Vercel)
This repo is a **static site — no build step**. `vercel.json` already sets `framework: null`,
`buildCommand: null` and `outputDirectory: "."`, so it deploys correctly even on a project that
was previously configured for Vite. `cleanUrls` is enabled, so pages are reachable at `/about`,
`/privacy-policy`, `/terms-and-conditions`, `/contact`.

Just push to GitHub and Vercel redeploys automatically.

## Customise
- Contact email is `support@allcreatormind.com` (set in `contact.html`, `privacy-policy.html`, `terms-and-conditions.html`).
- Colours and fonts live at the top of `styles.css` (CSS variables under `:root`).
