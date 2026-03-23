# Цаагуур - Mongolia Trend Analytics

Real-time trending topics dashboard for Mongolia. Monitors Mongolian social media and news, visualizes what's trending with velocity scoring and sentiment analysis.

**Live:** [trend.byamb4.dev](https://trend.byamb4.dev)

## Features

- **Trending Topics** - topics ranked by velocity (rising/falling/stable)
- **Timeline Scrubber** - scrub through 7 days of rankings, see how topics rise and fall
- **Network Graph** - bubble chart + force graph showing topic relationships
- **News Feed** - latest news articles from Mongolian news sites
- **Daily Digest** - daily trend summary in Mongolian
- **Sentiment Analysis** - positive/negative/neutral per topic
- **Tag Detail Pages** - deep dive into any topic with posts, news, engagement charts
- **Dark Mode** - full dark/light theme support

## Tech Stack

- **Next.js 16** - App Router, React 19, Turbopack
- **Tailwind CSS v4** - styling
- **Recharts** - charts
- **D3-Force** - network visualization
- **Canvas API** - bubble chart rendering

## Getting Started

```bash
# Install
pnpm install

# Run with mock data
pnpm dev
```

Open [localhost:3000](http://localhost:3000). The app runs with mock data, no backend needed.

### Connect to a real backend

Set `API_URL` in `.env.local` to point to your API server:

```env
API_URL=http://localhost:8001
```

Then replace `app/api/[...path]/route.ts` with a proxy to your backend.

## Project Structure

```
app/
  page.tsx              # Homepage - hot topics, timeline, trending posts
  network/              # Bubble chart + force graph
  news/                 # News articles feed
  compare/              # Tag comparison
  tag/[id]/             # Tag detail page
  about/                # About page
  api/[...path]/        # Mock API (returns fixture data)

components/
  header.tsx            # Navigation header
  theme-provider.tsx    # Dark/light mode

mock/                   # JSON fixture files for development
  mock_top.json         # Top trending tags
  mock_overview.json    # Dashboard stats
  mock_timeline.json    # Timeline snapshots
  mock_digest.json      # Daily digest
  mock_network.json     # Co-occurrence graph
  mock_posts.json       # Facebook posts
  mock_news.json        # News articles

lib/
  utils.ts              # Mongolian date formatting, cn() helper
```

## Contributing

Contributions welcome! This repo contains the **frontend only**.

### What you can contribute

- UI improvements and new visualizations
- Mobile responsiveness
- Performance optimizations
- Accessibility improvements
- New chart types or data displays
- Mongolian language improvements
- Bug fixes

### How to contribute

1. Fork this repo
2. Create a branch: `git checkout -b feature/my-feature`
3. Make your changes using the mock data
4. Test: `pnpm dev`
5. Submit a PR

### Guidelines

- Use Tailwind CSS, no custom CSS files
- Follow existing component patterns
- UI text should be in **Mongolian**
- Test in both dark and light mode
- No `lang="mn"` on the html tag

## License

MIT

## Author

**ByamB4** - [instagram.com/byamb4](https://instagram.com/byamb4)
