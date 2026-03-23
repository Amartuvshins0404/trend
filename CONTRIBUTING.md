# Contributing

Thanks for your interest in contributing to Цаагуур!

## Setup

```bash
git clone https://github.com/ByamB4/trend.git
cd trend
pnpm install
pnpm dev
```

The app runs with mock data, no backend setup needed.

## What to work on

Check [Issues](https://github.com/ByamB4/trend/issues) for open tasks. Or pick from:

- **UI/UX** - improve existing pages, add animations, fix mobile layout
- **New visualizations** - charts, graphs, data displays
- **Performance** - reduce bundle size, optimize rendering
- **Accessibility** - keyboard navigation, screen readers, ARIA

## Rules

1. **Frontend only** - this repo has no backend. Use mock data in `mock/`
2. **Mongolian UI** - all user-facing text in Mongolian
3. **Tailwind only** - no custom CSS files
4. **Dark mode** - test in both themes
5. **No breaking changes** - existing API contract must stay the same

## Code Style

- TypeScript strict
- Functional components
- `"use client"` only when needed
- Use `cn()` from `lib/utils.ts` for className merging
- Follow existing patterns in the codebase

## PR Process

1. Fork > branch > code > test > PR
2. Include a screenshot if it's a visual change
3. Describe what and why in the PR description
4. One feature per PR, keep it focused
