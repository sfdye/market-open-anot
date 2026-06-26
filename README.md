# Market Open Anot?

Check if your Singapore wet market / hawker centre is open or closed today.

**Live:** https://sfdye.github.io/market-open-anot/

## Why

Wet markets in Singapore close every Monday and have quarterly cleaning closures. The schedule is publicly available on [data.gov.sg](https://data.gov.sg/datasets/d_bda4baa634dd1cc7a6c7cad5f19e2d68/view) but not easy to check quickly. This app gives you the answer at a glance.

## Features

- Instant open/closed status for your favorited markets
- Covers all 123 NEA-managed hawker centres and wet markets
- Detects Monday rest days, quarterly cleaning, and other maintenance closures
- Upcoming closures list (next 30 days)
- Bilingual: English and Chinese
- Works offline after first visit (PWA with service worker)
- Installable on iOS and Android home screens
- Senior-friendly: large text, high contrast, minimal interaction needed

## Data Source

[Dates of Hawker Centre Closure](https://data.gov.sg/datasets/d_bda4baa634dd1cc7a6c7cad5f19e2d68/view) from Singapore's National Environment Agency via data.gov.sg.

## Tech

Plain HTML + CSS + JS. No frameworks, no build step, no dependencies.

## Development

Serve the files with any static server:

```sh
npx serve .
```

Then open http://localhost:3000.

## Testing

Unit tests for the closure logic (date parsing, open/closed detection, boundary conditions). Uses Node's built-in test runner — no dependencies.

```sh
npm test
```

Tests run automatically on push/PR via GitHub Actions.

## Deployment

Hosted on GitHub Pages. Any push to `main` triggers a deploy.

## License

MIT
