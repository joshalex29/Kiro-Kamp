# Design Document: Animal Biome Explorer

## Overview

The Animal Biome Explorer is a fully static, single-page web application built with vanilla HTML, CSS, and JavaScript — no frameworks, no build tools, no backend. All animal data ships as a static `data.js` file that is loaded synchronously with the page. The app renders a biome filter bar, a search bar, and a responsive card grid. Filtering and searching happen entirely in-memory in the browser.

The core interaction model is straightforward:
- The user arrives and sees all 20+ animal cards.
- Clicking a biome chip filters the grid to that biome. Clicking the active chip again deactivates it (toggle behaviour, single-select).
- Typing in the search bar narrows results by name, combined with any active biome filter.
- When no cards match, a "No Results" state replaces the grid.

All state lives in a plain JavaScript module-level object (`AppState`) and re-renders are triggered by calling a single `render()` function.

---

## Architecture

The app is a purely client-side, no-build static site. The entire "backend" is a pre-loaded JavaScript data array.

```
┌────────────────────────────────────────────────────────────┐
│                        Browser                             │
│                                                            │
│  index.html  ──loads──▶  styles.css                        │
│       │                                                    │
│       └──loads──▶  data.js  (animal dataset array)         │
│       └──loads──▶  app.js   (application logic)            │
│                       │                                    │
│              ┌────────▼────────┐                           │
│              │    AppState     │                           │
│              │  activeFilter   │                           │
│              │  searchQuery    │                           │
│              │  dataLoadError  │                           │
│              └────────┬────────┘                           │
│                       │                                    │
│              ┌────────▼────────┐                           │
│              │  filterAnimals()│  (pure function)          │
│              └────────┬────────┘                           │
│                       │                                    │
│   ┌───────────────────▼───────────────────────┐            │
│   │               render()                    │            │
│   │  ┌──────────────────────────────────────┐ │            │
│   │  │  renderBiomeFilters()                │ │            │
│   │  │  renderCards() / renderNoResults()   │ │            │
│   │  │  renderErrorState()                  │ │            │
│   │  └──────────────────────────────────────┘ │            │
│   └───────────────────────────────────────────┘            │
└────────────────────────────────────────────────────────────┘
```

**Data flow:**
1. `data.js` declares a global `window.ANIMALS` array.
2. `app.js` reads `window.ANIMALS`, sets up event listeners, and calls `render()` once on load.
3. Every user interaction (chip click, search input) mutates `AppState` and calls `render()`.
4. `render()` is a full re-render — it calls pure helper functions that produce HTML strings, then sets `innerHTML` on the three root DOM containers.

### File Structure

```
/
├── index.html          # Shell: imports data.js, app.js, styles.css
├── styles.css          # All styles (layout, components, responsive)
├── data.js             # window.ANIMALS = [ ... ] (20+ records)
└── app.js              # AppState, event listeners, render pipeline
```

---

## Components and Interfaces

### HTML Structure (index.html)

```html
<body>
  <header>
    <h1>Animal Biome Explorer</h1>
    <input id="search-bar" type="search" maxlength="100" placeholder="Search animals…" aria-label="Search animals by name" />
  </header>

  <nav id="biome-filter-bar" role="navigation" aria-label="Filter by biome">
    <!-- Biome chip buttons injected by renderBiomeFilters() -->
  </nav>

  <main id="results-area" aria-live="polite" aria-label="Animal results">
    <!-- Animal cards or no-results message injected by render() -->
  </main>
</body>
```

`aria-live="polite"` on `#results-area` ensures screen readers announce filter/search result changes.

### JavaScript Components (app.js)

#### AppState

```js
const AppState = {
  activeFilter: null,   // string | null — the active biome name, or null for "all"
  searchQuery:  '',     // string — current value of the search input
  dataLoadError: false  // boolean — true if window.ANIMALS failed to load
};
```

#### filterAnimals(animals, query, activeFilter) → Animal[]

Pure function. Applies both filters and returns the matching subset. No side effects.

```
Input:  animals[]      — the full dataset
        query          — trimmed, lowercase search string
        activeFilter   — biome string or null
Output: Animal[]       — filtered array (may be empty)
```

Algorithm:
1. If `activeFilter` is non-null, keep only animals whose `biomes` array includes `activeFilter`.
2. If `query` is non-empty, further keep only animals whose `name.toLowerCase()` contains `query.toLowerCase()`.
3. Return the result.

#### renderBiomeFilters(biomes, activeFilter) → string

Returns an HTML string of `<button>` elements for the biome filter bar.
Each button gets `data-biome="<name>"`, `aria-pressed="true|false"`, and a CSS class `biome-chip--active` when it matches `activeFilter`.

#### renderCard(animal) → string

Returns an HTML string for a single animal card. Applies truncation logic to name (60 chars) and description (150 chars). Produces a `<figure>` element with an `<img>` (with `onerror` fallback to placeholder), the animal's name as `<figcaption>`, biome labels, and description.

#### renderNoResults(query, activeFilter) → string

Returns the HTML string for the no-results state, including a descriptive message referencing the current query and/or active filter.

#### renderErrorState() → string

Returns the HTML string for the data-load error state, including a retry `<button id="retry-btn">`.

#### render()

Orchestrator. Reads `AppState`, calls helpers, writes to DOM:
```
render():
  if AppState.dataLoadError → results-area.innerHTML = renderErrorState()
  else:
    biome-filter-bar.innerHTML = renderBiomeFilters(BIOMES, AppState.activeFilter)
    matched = filterAnimals(window.ANIMALS, AppState.searchQuery, AppState.activeFilter)
    if matched.length === 0:
      results-area.innerHTML = renderNoResults(AppState.searchQuery, AppState.activeFilter)
    else:
      results-area.innerHTML = matched.map(renderCard).join('')
```

#### Event Listeners

| Event | Element | Handler |
|---|---|---|
| `input` | `#search-bar` | Debounced 300 ms → set `AppState.searchQuery`, call `render()` |
| `click` | `#biome-filter-bar` (delegated) | Toggle `AppState.activeFilter`, call `render()` |
| `click` | `#results-area` (delegated, retry) | Reset `AppState.dataLoadError`, call `loadData()` then `render()` |

Debounce is implemented as a plain `setTimeout`/`clearTimeout` wrapper — no library needed.

#### loadData()

Called once on `DOMContentLoaded`. Sets a 5-second timeout. If `window.ANIMALS` is defined and is a non-empty array, proceeds normally. If not available after the timeout, sets `AppState.dataLoadError = true` and calls `render()`.

---

## Data Models

### Animal Record (in data.js)

```js
{
  id:          string,    // unique slug, e.g. "snow-leopard"
  name:        string,    // common name, ≤ 60 chars
  biomes:      string[],  // 1–N biome names from BIOMES constant, e.g. ["Tundra", "Taiga"]
  description: string,    // ≤ 150 chars
  image:       string,    // relative path, e.g. "images/snow-leopard.jpg"
  imageAlt:    string     // non-empty alt text for the image
}
```

### BIOMES Constant (in app.js)

```js
const BIOMES = [
  'Rainforest', 'Desert', 'Tundra', 'Ocean',
  'Grassland', 'Savanna', 'Wetlands', 'Taiga'
];
```

Exactly 8 biomes, matching the Biome_Filter requirement. The dataset guarantees at least one animal per biome.

### Truncation Helper

```js
function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}
```

Applied to `animal.name` at 60 chars and `animal.description` at 150 chars during card rendering.

### Placeholder Image

A single `placeholder.svg` (or `placeholder.png`) bundled with the project. Applied via the `onerror` attribute on card `<img>` elements:

```html
<img src="${animal.image}" alt="${animal.imageAlt}" onerror="this.onerror=null;this.src='placeholder.svg'">
```

The `this.onerror=null` guard prevents infinite error loops if the placeholder itself fails.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Biome filter shows only matching animals

*For any* active biome filter and any dataset of animals, every card rendered in the results area SHALL belong to an animal whose `biomes` array includes the active biome — no card from a non-matching biome shall appear.

**Validates: Requirements 1.2, 1.4**

---

### Property 2: Search filter shows only name-matching animals

*For any* non-empty search query and any dataset of animals, every card rendered in the results area SHALL belong to an animal whose name (case-insensitively) contains the query string.

**Validates: Requirements 2.2**

---

### Property 3: Combined filter is the intersection of biome and search filters

*For any* combination of an active biome filter and a non-empty search query, the set of rendered cards SHALL be exactly the intersection of the biome-filtered set and the search-filtered set — neither a superset nor a subset.

**Validates: Requirements 2.3**

---

### Property 4: Deactivating a filter restores all matching animals

*For any* dataset, activating a biome filter and then deactivating it (by clicking the same chip again) SHALL produce a results set identical to the results set that was shown before the filter was activated (assuming the search query is unchanged).

**Validates: Requirements 1.3**

---

### Property 5: filterAnimals is idempotent

*For any* dataset, query, and active filter, calling `filterAnimals` twice in succession with the same arguments SHALL return the same array contents as calling it once — the function has no side effects and produces a stable output.

**Validates: Requirements 1.2, 2.2**

---

### Property 6: Whitespace-only queries are treated as empty

*For any* string composed entirely of whitespace characters, applying it as a search query SHALL produce the same results as an empty query (i.e., no name filtering is applied).

**Validates: Requirements 2.2, 2.4**

---

### Property 7: Truncation preserves prefix

*For any* animal name or description string longer than its character limit, the truncated output SHALL start with exactly the first `maxLen` characters of the original string, followed by `'…'`.

**Validates: Requirements 3.1, 3.5**

---

### Property 8: No-results state is exclusive with card rendering

*For any* filter + query combination that yields zero matching animals, the results area SHALL contain the no-results message and SHALL NOT contain any animal card elements — and vice versa, when at least one card matches, no no-results message SHALL appear.

**Validates: Requirements 4.1, 4.3**

---

## Error Handling

### Data Load Failure (Requirement 6.3)

If `window.ANIMALS` is not defined or the 5-second load timeout fires first:
- `AppState.dataLoadError` is set to `true`.
- `render()` writes `renderErrorState()` into `#results-area`.
- The error message is user-visible and includes a "Retry" button.
- Clicking Retry resets `AppState.dataLoadError` and re-attempts `loadData()`.

### Image Load Failure (Requirement 3.3)

Handled inline via `onerror` on every `<img>` tag:
```html
onerror="this.onerror=null;this.src='placeholder.svg'"
```
The rest of the card content is unaffected.

### Empty / Missing Dataset

If `window.ANIMALS` is defined but empty, the app renders a no-results state (not an error state) since the data loaded successfully but returned no animals.

### Search Input Edge Cases

- Input beyond 100 characters is blocked by `maxlength="100"` on the `<input>` element (Requirement 2.5).
- Leading/trailing whitespace in the search query is trimmed before comparison so `"  lion  "` matches the same cards as `"lion"`.
- Whitespace-only queries are normalised to empty string (no filter applied).

---

## Testing Strategy

### Unit Tests

Unit tests cover pure functions and edge cases with concrete examples. Since the app ships no build tooling, tests can be run via a lightweight test file loaded in the browser or with Node.js (the pure functions have no DOM dependencies).

Key unit test cases:
- `filterAnimals` returns all animals when query is empty and filter is null.
- `filterAnimals` returns empty array when no animal matches.
- `filterAnimals` with biome filter excludes animals not in that biome.
- `filterAnimals` is case-insensitive for name search.
- `truncate` returns the original string unchanged when it is at or under the limit.
- `truncate` appends `'…'` and cuts at exactly `maxLen` when over the limit.
- `renderCard` includes non-empty `alt` text.
- `renderNoResults` message is under 200 characters.
- Debounce wrapper delays the callback by the specified time.

### Property-Based Tests

A property-based testing library suitable for vanilla JS is [fast-check](https://github.com/dubzzz/fast-check). Since `data.js` and `app.js` are plain JS modules, fast-check can be loaded as a `<script>` tag in a test HTML file or run in Node.js with `require`.

Each property test MUST run a minimum of 100 iterations.

**Tag format:** `// Feature: animal-biome-explorer, Property {N}: {property_text}`

| Property | Test description | Generator strategy |
|---|---|---|
| P1: Biome filter shows only matching | Generate random animal arrays and a random biome; assert every result has that biome | `fc.array(animalArb)`, `fc.constantFrom(...BIOMES)` |
| P2: Search filter shows only name-matching | Generate random animal arrays and a random non-empty query; assert every result name contains the query (case-insensitive) | `fc.array(animalArb)`, `fc.string()` |
| P3: Combined filter is intersection | Assert `filterAnimals(animals, q, b)` ⊆ `filterAnimals(animals, q, null)` ∩ `filterAnimals(animals, '', b)` | Combined generators |
| P4: Deactivating filter restores results | Apply filter then clear it; assert result matches unfiltered | `fc.array(animalArb)`, `fc.constantFrom(...BIOMES)` |
| P5: filterAnimals is idempotent | Run twice, compare output | Existing generators |
| P6: Whitespace query equals empty | Assert `filterAnimals(a, '   ', null)` equals `filterAnimals(a, '', null)` | `fc.array(animalArb)` |
| P7: Truncation preserves prefix | Assert output starts with `str.slice(0, maxLen)` and ends with `'…'` when `str.length > maxLen` | `fc.string()`, `fc.integer({min:1, max:200})` |
| P8: No-results exclusive with cards | Assert result length 0 → no-results shown; result length > 0 → no-results absent | `fc.array(animalArb)`, combined filter generators |

### Integration Tests

- Load `index.html` in a real browser (or Playwright/Puppeteer) and verify:
  - All 8 biome chips are rendered on load.
  - Selecting a biome chip updates the grid (smoke test with 1–2 biomes).
  - Image `onerror` fallback displays the placeholder.
  - Retry button appears and is clickable when error state is triggered.

### Accessibility Checks

- Verify `aria-pressed` toggles on biome chips.
- Verify `aria-live="polite"` region updates are announced (manual screen-reader check recommended).
- Verify all images have non-empty `alt` text.
