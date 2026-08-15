# Market Open Anot?

Check if your Singapore wet market / hawker centre is open or closed today.

**Live:** https://openanot.com

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

Plain HTML + CSS + TypeScript. No frameworks and no runtime dependencies. Sources live in `src/`; `npm run build` compiles them to plain ES modules at the repo root, which is what the browser loads.

## Development

```sh
npm install
npm run watch   # recompile src/ on change
npm run dev     # browser with live reload (browser-sync), in a second terminal
```

## Testing

Unit tests for the closure logic (date parsing, open/closed detection, boundary conditions) and for the notification schedule. Node's built-in runner executes the `.ts` files directly by stripping types, so there is nothing to install.

```sh
npm test
npm run typecheck
```

Both run automatically on push/PR via GitHub Actions.

## Deployment

Hosted on GitHub Pages, served straight from the repo root of `main`, so the compiled JS is committed next to its source. Run `npm run build` and commit the output with your change — CI rebuilds and fails if what is checked in is stale.

## License

MIT
