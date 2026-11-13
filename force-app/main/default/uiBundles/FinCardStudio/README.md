# Fin Card Studio (UI Bundle)

React, Vite, TypeScript, Tailwind, and shadcn/ui app that runs inside Salesforce as the **Fin Card Studio** Lightning app. It reads and writes `Fin_UI_Card__c` through the UI API GraphQL endpoint and calls the `FinCardStudioResource` Apex REST endpoints (`/fincards/match`, `/seed`, `/generate`, `/settings`, `/imagehosts`).

User guide: [docs/CARD-STUDIO.md](../../../../../docs/CARD-STUDIO.md).

## Commands

Run from this folder (Node.js 22 or later):

```bash
npm ci
npm run dev            # local dev server
npm test               # Vitest unit tests
npm run build          # type-check and write dist/ (required before deploy)
npm run graphql:schema # fetch the org GraphQL schema to ../../../../../schema.graphql
```

Deploy from the project root after building:

```bash
sf project deploy start --source-dir force-app/main/default/uiBundles/FinCardStudio --target-org <alias>
```

`dist/` is not committed; `scripts/setup.sh` builds it for you.
