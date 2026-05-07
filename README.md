# Research Trend Explorer

Explore how scholarly publication volume evolves over time for any research topic. Powered by the [OpenAlex](https://openalex.org/) open catalog of 250M+ academic works.

![Research Trend Explorer](https://img.shields.io/badge/OpenAlex-Powered-6ee7b7?style=flat-square)

## Features

- **Semantic search** — queries match against titles, abstracts, and topic tags
- **Publication timeline** — area chart showing works per year from 1950 to present
- **Summary stats** — total works, peak year, peak output, and last-5-year count
- **Zero config** — no API key needed; hits the free OpenAlex API directly
- **Example queries** — one-click chips to explore popular topics

## Getting Started

```bash
# Clone the repo
git clone https://github.com/<your-username>/research-trend-explorer.git
cd research-trend-explorer

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build for Production

```bash
npm run build
```

The output is in the `dist/` folder — deploy it to any static host (Vercel, Netlify, GitHub Pages, etc.).

## Deploy to GitHub Pages

1. Install the gh-pages package:

   ```bash
   npm install -D gh-pages
   ```

2. Add to `package.json` scripts:

   ```json
   "deploy": "npm run build && gh-pages -d dist"
   ```

3. Set the `base` in `vite.config.js` to your repo name:

   ```js
   export default defineConfig({
     base: "/research-trend-explorer/",
     plugins: [react()],
   });
   ```

4. Run `npm run deploy`.

## Tech Stack

- [React 18](https://react.dev/)
- [Recharts](https://recharts.org/) — charting
- [Vite](https://vitejs.dev/) — build tool
- [OpenAlex API](https://docs.openalex.org/) — scholarly data

## API Usage

This app uses the OpenAlex REST API with no authentication. The key endpoint:

```
GET https://api.openalex.org/works?search=<query>&group_by=publication_year
```

This returns publication counts grouped by year for works matching the search query. See the [OpenAlex docs](https://docs.openalex.org/) for more filtering options.

## License

MIT
