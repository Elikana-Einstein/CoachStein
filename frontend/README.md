# Fieldnotes — Engineering Roadmap Planner

A responsive planner built with React, TypeScript, and Vite. It supports multiple goals and an editable roadmap hierarchy: roadmaps → tracks → phases → tasks.

## Start the app

```sh
npm install
npm run dev
```

## Project structure

```text
src/
  components/Sidebar.tsx
  features/planner/
    Planner.tsx          Dashboard and roadmap workspace
    RoadmapDialog.tsx    Create and edit roadmap form
    TaskDialog.tsx       Create and edit task form
    progress.ts          Shared progress, status, and reorder rules
    storage.ts           localStorage adapter and editable sample roadmap
    types.ts             Planner data model and form types
  App.tsx
  main.tsx
  styles.css
```

## Persistence and progress

Roadmaps are saved in this browser's local storage under `fieldnotes.planner.roadmaps.v1`. The sample Personal RAG Assistant roadmap is seeded on first use and is labeled so it can be edited, archived, or deleted. Data is local to this browser and is not synced or user-authenticated.

Roadmap, track, and phase progress are completed tasks divided by applicable tasks. Empty levels show 0% without a division error. A roadmap only becomes completed when every task has been completed; on-hold remains on hold. Reordering is available with the outline controls and does not alter task dependency links.

`npm run build` runs strict TypeScript checks and the Vite production build. `npm run lint` runs Oxlint. There is no test runner configured in this starter.
