# Wargaming UI

This project is a React + TypeScript app built with Vite. It includes a simple wizard-style UI and a step bar component.

## Run the UI locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open the local URL shown in the terminal (usually http://localhost:5173).

## Build for production

```bash
npm run build
```

## Type checking

```bash
npm run typecheck
```

## Project structure

- `src/app/` - app entry and top-level layout
- `src/components/` - reusable UI pieces such as the step bar
- `src/features/` - feature-specific panels and types
- `src/stores/` - wizard state and context
- `src/types/` - shared wizard type definitions

## Notes

This README is intended to help anyone clone the project and view the UI quickly without needing extra setup.
