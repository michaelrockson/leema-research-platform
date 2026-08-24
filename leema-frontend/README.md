# Leema Frontend

The dashboard UI for the Leema AI Agent built with React 19, TypeScript, Vite and Tailwind CSS v4.

## Tech Stack

| Tool                        | Version               | Purpose                                         |
|-----------------------------|-----------------------|-------------------------------------------------|
| React                       | 19                    | UI framework                                    |
| TypeScript                  | 6                     | Type safety                                     |
| Vite                        | 8                     | Build tool & dev server                         |
| Tailwind CSS                | v4                    | Utility-first styling (via `@tailwindcss/vite`) |
| Base UI                     | 1.7                   | Unstyled, accessible UI primitives              |
| Lucide React                | latest                | Icon library                                    |
| CVA + clsx + tailwind-merge | —                     | Class variant & conditional styling utilities   |
| Yarn                        | 4.9.2 (Berry, no PnP) | Package manager                                 |

## Prerequisites

- Node.js 18+
- Yarn 4+ install via `npm install -g yarn` or enable via Corepack: `corepack enable`

## Getting Started

Install dependencies:

```bash
yarn install
```

Start the development server:

```bash
yarn dev
```

The app will be available at `http://localhost:5173` by default.

## Available Scripts

| Command        | Description                          |
|----------------|--------------------------------------|
| `yarn dev`     | Start the Vite dev server with HMR   |
| `yarn build`   | Type-check and build for production  |
| `yarn preview` | Locally preview the production build |
| `yarn lint`    | Run ESLint across all source files   |

## Project Structure

```
leema-frontend/
├── src/                  # Application source code
├── public/               # Static assets served as-is
├── index.html            # HTML entry point
├── vite.config.ts        # Vite config (Tailwind plugin, @ alias)
├── tsconfig.json         # Root TypeScript config
├── tsconfig.app.json     # App-specific TS config
├── tsconfig.node.json    # Node/tooling TS config
├── eslint.config.js      # ESLint flat config
├── components.json       # UI component registry config
├── .yarnrc.yml           # Yarn Berry config nodeLinker: node-modules (no PnP)
└── package.json
```

## Notes

- **Package manager**: Yarn Berry (v4) is used with `nodeLinker: node-modules` Plug'n'Play is intentionally disabled for
  broad tooling compatibility.
- **Path alias**: `@` resolves to `./src`, configured in both `vite.config.ts` and `tsconfig.app.json`.
- **Tailwind CSS v4** is integrated directly as a Vite plugin via `@tailwindcss/vite` no `postcss.config.js` needed.
