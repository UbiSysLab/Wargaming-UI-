# App Design Document

## Project goal
Build a small React + TypeScript UI app using Vite as the build tool.

## Architecture
- `src/main.tsx` mounts the React app.
- `src/App.tsx` contains the main component.
- `src/assets/` stores static assets imported by the app.
- `public/` stores static files served as-is by Vite.

## Core decisions
- Use TypeScript for better developer feedback and safer refactoring.
- Keep app state minimal: `useState` for simple counter behavior.
- Keep styles in CSS files, not in JS, for simplicity at this stage.

## Directory structure
- `src/`
  - `App.tsx`
  - `main.tsx`
  - `index.css`
  - `App.css`
  - `assets/`
- `public/`
  - `favicon.svg`
  - `icons.svg`
- `document/`
  - `design.md`
  - `typescript-setup.md`

## Future improvements
- Add a typed component library and shared UI primitives.
- Add routing with React Router and typed route params.
- Add unit tests with Vitest and React Testing Library.
- Add a proper design system for colors, spacing, and typography.

## How to use this app
1. Run `npm install`.
2. Run `npm run dev` to start the local server.
3. Open the Vite URL shown in the terminal.

## Why this design
This app is intentionally simple so the TypeScript setup is the main learning focus. The design document is kept separate from implementation notes so the project remains easier to understand during early development.
