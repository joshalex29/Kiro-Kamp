# Implementation Plan: Animal Biome Explorer

## Overview

Build a fully static, single-page Animal Biome Explorer using vanilla HTML, CSS, and JavaScript. Tasks are ordered by dependency: data first, then pure logic, then UI/rendering, then event wiring, then tests. Each step integrates immediately into the running page — no orphaned code.

---

## Tasks

- [x] 1. Scaffold index.html page shell
  - Replace the current minimal `index.html` with the full page shell described in the design
  - Add `<header>` with `<h1>Animal Biome Explorer</h1>` and `<input id="search-bar">` (type="search", maxlength="100", aria-label, placeholder)
  - Add `<nav id="biome-filter-bar">` with role="navigation" and aria-label="Filter by biome"
  - Add `<main id="results-area">` with aria-live="polite" and aria-label="Animal results"
  - Add `<script src="data.js">` and `<script src="app.js">` at the bottom of `<body>` (in that order)
  - Keep the existing `<link rel="stylesheet" href="styles.css">` in `<head>`
  - _Requirements: 2.1, 3.1, 5.4_

- [x] 2. Create the animal dataset (data.js)
  - [x] 2.1 Create `data.js` with `window.ANIMALS` array
    - Declare `window.ANIMALS = [ ... ]` containing at least 20 distinct animal records
    - Each record must have fields: `id` (unique slug), `name` (≤60 chars), `biomes` (array of biome strings), `description` (≤150 chars), `image` (relative path string), `imageAlt` (non-empty string)
    - Cover all 8 biomes: Rainforest, Desert, Tundra, Ocean, Grassland, Savanna, Wetlands, Taiga — at least one animal per biome
    - Use image paths like `"images/jaguar.jpg"` (images do not need to exist yet; placeholder.svg handles failures)
    - _Requirements: 3.1, 3.2, 3.4, 6.2_

- [x] 3. Create placeholder.svg fallback image
  - Create `placeholder.svg` in the project root with a simple SVG (e.g., a grey rectangle with a paw-print or generic silhouette icon)
  - This file is referenced by the `onerror` handler on every animal card `<img>`
  - _Requirements: 3.3_

- [ ] 4. Implement pure utility functions in app.js
  - [x] 4.1 Create `app.js` with `AppState`, `BIOMES` constant, and `truncate()` helper
    - Define `const BIOMES = ['Rainforest','Desert','Tundra','Ocean','Grassland','Savanna','Wetlands','Taiga']`
    - Define `const AppState = { activeFilter: null, searchQuery: '', dataLoadError: false }`
    - Implement `function truncate(str, maxLen)` — returns str unchanged if ≤ maxLen, otherwise `str.slice(0, maxLen) + '…'`
    - _Requirements: 3.5, 1.2, 2.2_

  - [x] 4.2 Write unit tests for `truncate()` in `tests/unit.test.js`
    - Create `tests/unit.test.js` (to be loaded via Node.js or a test HTML)
    - Test: input at exactly maxLen → returned unchanged
    - Test: input one character over maxLen → last char replaced with `'…'`
    - Test: empty string → returned unchanged
    - _Requirements: 3.5_

  - [x] 4.3 Implement `filterAnimals(animals, query, activeFilter)` in `app.js`
    - Pure function: no side effects, returns a new filtered array
    - Step 1: if `activeFilter` is non-null, keep only animals whose `biomes` array includes `activeFilter`
    - Step 2: trim and lowercase `query`; if non-empty (and not whitespace-only), keep only animals whose `name.toLowerCase()` contains the lowercased query
    - Return the resulting array (may be empty)
    - _Requirements: 1.2, 1.4, 2.2, 2.3, 2.4_

  - [-] 4.4 Write property test for `filterAnimals` — Property 1 (biome filter shows only matching animals)
    - File: `tests/property.test.js`
    - Tag: `// Feature: animal-biome-explorer, Property 1: Biome filter shows only matching animals`
    - Generate random animal arrays and a random biome; assert every result has that biome in its `biomes` array
    - Use `fc.array(animalArb)` and `fc.constantFrom(...BIOMES)`; minimum 100 runs
    - **Property 1: Biome filter shows only matching animals**
    - **Validates: Requirements 1.2, 1.4**

  - [-] 4.5 Write property test for `filterAnimals` — Property 2 (search filter shows only name-matching animals)
    - Tag: `// Feature: animal-biome-explorer, Property 2: Search filter shows only name-matching animals`
    - Generate random animal arrays and a random non-empty query string; assert every result's name (lowercased) contains the query (lowercased)
    - **Property 2: Search filter shows only name-matching animals**
    - **Validates: Requirements 2.2**

  - [-] 4.6 Write property test for `filterAnimals` — Property 3 (combined filter is intersection)
    - Tag: `// Feature: animal-biome-explorer, Property 3: Combined filter is the intersection of biome and search filters`
    - Assert `filterAnimals(animals, q, b)` ⊆ `filterAnimals(animals, q, null)` ∩ `filterAnimals(animals, '', b)` for any q and b
    - **Property 3: Combined filter is the intersection of biome and search filters**
    - **Validates: Requirements 2.3**

  - [-] 4.7 Write property test for `filterAnimals` — Property 4 (deactivating filter restores results)
    - Tag: `// Feature: animal-biome-explorer, Property 4: Deactivating a filter restores all matching animals`
    - Apply filter then pass `null` as activeFilter; assert result equals `filterAnimals(animals, query, null)`
    - **Property 4: Deactivating a filter restores all matching animals**
    - **Validates: Requirements 1.3**

  - [-] 4.8 Write property test for `filterAnimals` — Property 5 (idempotent)
    - Tag: `// Feature: animal-biome-explorer, Property 5: filterAnimals is idempotent`
    - Call `filterAnimals` twice with identical arguments; assert both outputs have the same elements in the same order
    - **Property 5: filterAnimals is idempotent**
    - **Validates: Requirements 1.2, 2.2**

  - [-] 4.9 Write property test for `filterAnimals` — Property 6 (whitespace-only query equals empty)
    - Tag: `// Feature: animal-biome-explorer, Property 6: Whitespace-only queries are treated as empty`
    - Assert `filterAnimals(animals, '   ', null)` produces the same results as `filterAnimals(animals, '', null)` for any dataset
    - **Property 6: Whitespace-only queries are treated as empty**
    - **Validates: Requirements 2.2, 2.4**

  - [-] 4.10 Write property test for `truncate` — Property 7 (truncation preserves prefix)
    - Tag: `// Feature: animal-biome-explorer, Property 7: Truncation preserves prefix`
    - For any string with `str.length > maxLen`, assert output starts with `str.slice(0, maxLen)` and ends with `'…'`
    - Use `fc.string()` and `fc.integer({min:1, max:200})`
    - **Property 7: Truncation preserves prefix**
    - **Validates: Requirements 3.1, 3.5**

- [ ] 5. Implement rendering functions in app.js
  - [-] 5.1 Implement `renderBiomeFilters(biomes, activeFilter)` in `app.js`
    - Returns an HTML string of `<button>` elements, one per biome
    - Each button: `data-biome="<name>"`, `aria-pressed="true|false"`, class `biome-chip`, and class `biome-chip--active` when it matches `activeFilter`
    - _Requirements: 1.1, 1.7_

  - [-] 5.2 Implement `renderCard(animal)` in `app.js`
    - Returns an HTML string for a single animal card as a `<figure>` element
    - Include `<img src="..." alt="..." onerror="this.onerror=null;this.src='placeholder.svg'">` using `animal.image` and `animal.imageAlt`
    - Apply `truncate(animal.name, 60)` in `<figcaption>` and `truncate(animal.description, 150)` in a `<p>`
    - Display biome labels (e.g., `<span class="biome-label">`) for each entry in `animal.biomes`
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [~] 5.3 Write unit tests for `renderCard()` in `tests/unit.test.js`
    - Test: output contains non-empty alt attribute for the image
    - Test: long name (>60 chars) is truncated with `'…'` in the output HTML
    - Test: long description (>150 chars) is truncated with `'…'` in the output HTML
    - _Requirements: 3.2, 3.5_

  - [-] 5.4 Implement `renderNoResults(query, activeFilter)` in `app.js`
    - Returns an HTML string for the no-results state
    - Message must be human-readable, ≤200 characters, and reference the current query and/or active filter
    - Suggest modifying the search term or biome filter
    - _Requirements: 4.1, 4.2, 4.3_

  - [~] 5.5 Write unit test for `renderNoResults()` in `tests/unit.test.js`
    - Test: message string is ≤ 200 characters for representative inputs (empty query + filter, query + null filter, query + filter)
    - _Requirements: 4.2_

  - [-] 5.6 Implement `renderErrorState()` in `app.js`
    - Returns an HTML string with a user-visible error message and `<button id="retry-btn">` for the retry action
    - _Requirements: 6.3_

  - [~] 5.7 Write property test — Property 8 (no-results state is exclusive with card rendering)
    - Tag: `// Feature: animal-biome-explorer, Property 8: No-results state is exclusive with card rendering`
    - For any filter + query yielding 0 results: rendered HTML contains no-results element and no `<figure>` card elements
    - For any filter + query yielding ≥1 result: rendered HTML contains `<figure>` elements and no no-results element
    - **Property 8: No-results state is exclusive with card rendering**
    - **Validates: Requirements 4.1, 4.3**

- [ ] 6. Implement `render()` orchestrator and `loadData()` in app.js
  - [~] 6.1 Implement `render()` function in `app.js`
    - If `AppState.dataLoadError` is true → write `renderErrorState()` into `#results-area` innerHTML and return early
    - Otherwise: write `renderBiomeFilters(BIOMES, AppState.activeFilter)` into `#biome-filter-bar` innerHTML
    - Call `filterAnimals(window.ANIMALS, AppState.searchQuery, AppState.activeFilter)` to get matched animals
    - If matched is empty → write `renderNoResults(...)` into `#results-area` innerHTML
    - Else → write `matched.map(renderCard).join('')` into `#results-area` innerHTML
    - _Requirements: 1.2, 1.5, 1.6, 2.2, 4.1, 4.3, 4.4_

  - [~] 6.2 Implement `loadData()` and `DOMContentLoaded` bootstrap in `app.js`
    - `loadData()` checks `window.ANIMALS` immediately; if defined and non-empty, calls `render()` and returns
    - Set a 5-second `setTimeout`: if `window.ANIMALS` is still unavailable after 5 s, set `AppState.dataLoadError = true` and call `render()`
    - Wire `loadData()` to `document.addEventListener('DOMContentLoaded', loadData)`
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 7. Implement event listeners in app.js
  - [~] 7.1 Implement the search input event listener with debounce
    - Implement a simple `debounce(fn, delay)` wrapper using `setTimeout`/`clearTimeout`
    - Attach a debounced (300 ms) `input` event listener on `#search-bar`
    - Handler: set `AppState.searchQuery = event.target.value`, call `render()`
    - _Requirements: 2.2, 2.4, 2.5_

  - [~] 7.2 Write unit test for the debounce wrapper in `tests/unit.test.js`
    - Test: callback is NOT called before the delay elapses
    - Test: callback IS called once after the delay
    - Test: rapid successive calls reset the timer (only the last call fires)
    - _Requirements: 2.2_

  - [~] 7.3 Implement delegated click listener on `#biome-filter-bar`
    - Attach a `click` listener to `#biome-filter-bar`
    - On click, read `event.target.dataset.biome`; if present, toggle `AppState.activeFilter` (set to biome if not active, null if already active), then call `render()`
    - _Requirements: 1.2, 1.3, 1.4, 1.7_

  - [~] 7.4 Implement delegated retry click listener on `#results-area`
    - Attach a `click` listener to `#results-area`
    - If `event.target.id === 'retry-btn'`, reset `AppState.dataLoadError = false`, call `loadData()` then `render()`
    - _Requirements: 6.3_

- [~] 8. Checkpoint — wire-up verification
  - Ensure all tests pass, ask the user if questions arise.
  - Open `index.html` in a browser: all 8 biome chips render, all 20+ cards appear on load, clicking a chip filters correctly, typing in search filters by name, combined filter works, no-results message appears when appropriate.

- [ ] 9. Style the page with styles.css
  - [~] 9.1 Add base styles and layout in `styles.css`
    - CSS reset / box-sizing, body font, colour palette
    - `<header>` layout: flex row, space between h1 and search bar, wraps on small screens
    - `<nav #biome-filter-bar>` layout: flex row, wrap, gap between chips
    - _Requirements: 5.4_

  - [~] 9.2 Style biome chip buttons and active state
    - `.biome-chip` base: pill shape, border, padding, cursor pointer, transition
    - `.biome-chip--active`: distinct background colour and/or border to indicate active state
    - `aria-pressed` attribute change reflected visually (can target `[aria-pressed="true"]`)
    - _Requirements: 1.7_

  - [~] 9.3 Style the animal card grid (responsive)
    - `#results-area` as a CSS Grid container
    - Mobile (<768 px): `grid-template-columns: 1fr` (single column)
    - Tablet (768 px–1199 px): `grid-template-columns: repeat(2, 1fr)`
    - Desktop (≥1200 px): `grid-template-columns: repeat(3, 1fr)` or `repeat(4, 1fr)`
    - Use `@media` breakpoints for 768 px and 1200 px
    - _Requirements: 5.1, 5.2, 5.3_

  - [~] 9.4 Style individual animal cards (`<figure>`)
    - Card: border, border-radius, overflow hidden, background
    - `<img>`: `width: 100%; aspect-ratio: 4/3; object-fit: cover`
    - `<figcaption>`: font-weight bold, padding
    - Biome label spans: small pill badges with background colour
    - Description paragraph: smaller font, muted colour, padding
    - _Requirements: 3.1_

  - [~] 9.5 Style no-results state and error state
    - Centred message text, adequate padding, muted/contrasting colour
    - Retry button: visible, focusable, styled consistently with biome chips
    - _Requirements: 4.2, 6.3_

- [~] 10. Final checkpoint — full review
  - Ensure all tests pass, ask the user if questions arise.
  - Verify responsive layout at 320 px, 768 px, and 1200 px+ in browser dev tools.
  - Verify placeholder.svg appears when an image path is broken.
  - Verify `aria-pressed` toggles correctly on biome chips.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Each task references specific requirements for traceability.
- `tests/unit.test.js` accumulates unit tests across multiple tasks — create the file on first use (task 4.2) and append to it in later tasks.
- `tests/property.test.js` accumulates property tests — create it on first use (task 4.4) and append in later tasks; load `fast-check` via a CDN `<script>` tag or `npm install fast-check` for Node execution.
- All property tests must run a minimum of 100 iterations.
- Checkpoints (tasks 8 and 10) are manual verification steps, not automated — confirm visually in the browser.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "3"] },
    { "id": 1, "tasks": ["4.1"] },
    { "id": 2, "tasks": ["4.3", "4.2"] },
    { "id": 3, "tasks": ["4.4", "4.5", "4.6", "4.7", "4.8", "4.9", "4.10", "5.1", "5.2", "5.4", "5.6"] },
    { "id": 4, "tasks": ["5.3", "5.5", "5.7", "6.1"] },
    { "id": 5, "tasks": ["6.2"] },
    { "id": 6, "tasks": ["7.1", "7.3", "7.4"] },
    { "id": 7, "tasks": ["7.2", "9.1"] },
    { "id": 8, "tasks": ["9.2", "9.3"] },
    { "id": 9, "tasks": ["9.4"] },
    { "id": 10, "tasks": ["9.5"] }
  ]
}
```
