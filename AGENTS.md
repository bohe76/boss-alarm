# Repository Guidelines

## Project Structure & Module Organization

`index.html` is the browser entry point. Main ES module source lives in `src/`, with screen modules in `src/screens/`, background timer logic in `src/workers/`, styling in `src/styles/`, and static app data in `src/data/` plus root-level `data/`. Tests live in `test/` and use the same feature-oriented naming as the modules they cover. Project documentation is under `docs/`; architecture details start at `docs/architecture/system_architecture.md`.

## Build, Test, and Development Commands

- `npm install`: install project dependencies from `package-lock.json`.
- `npm test`: run the full Vitest suite once.
- `npx vitest`: run Vitest in watch mode during development.
- `npm run lint`: run ESLint across the repository.

There is no separate build script. Run locally through a simple HTTP server or editor Live Server so ES modules load correctly; avoid opening `index.html` directly with the `file://` protocol.

## Coding Style & Naming Conventions

Use Vanilla JavaScript ES modules. Follow the existing 4-space indentation style in `src/*.js`, prefer single quotes for imports and string literals, and keep functions focused on one UI, data, or scheduling responsibility. Use English identifiers and filenames, for example `boss-scheduler.js`, `share-encoder.js`, and `custom-list-manager.js`. Keep user-facing Korean copy in data files or UI modules, not scattered through unrelated logic.

## Testing Guidelines

Vitest runs in `jsdom` with global test APIs configured by `vitest.config.js` and `test/setup.js`. Add or update tests in `test/` whenever behavior changes, especially scheduler, database, sharing, and calculator logic. Name tests after the feature or module under test, such as `boss-scheduler.apply.test.js` or `share-encoder.test.js`. Before submitting changes, run `npm test`; run `npm run lint` when JavaScript or config changed.

## Commit & Pull Request Guidelines

Follow the repository's Conventional Commit style with Korean summaries, for example `fix(share): 공유 링크 URL-safe base64 적용` or `docs(session): main-00003 갱신`. Use scopes that match the touched area: `calculator`, `share`, `scheduler`, `docs`, `release`, or similar.

Pull requests should include a concise change summary, linked issue when applicable, test results, and screenshots or short recordings for visible UI changes. Keep PRs focused; split unrelated documentation, release, and feature work when practical.

## Security & Configuration Tips

Do not commit secrets, local browser data, or analytics credentials. Treat browser storage migrations and shared URL payload changes as compatibility-sensitive; document behavior changes in `docs/` and add regression tests before changing encoded formats.
