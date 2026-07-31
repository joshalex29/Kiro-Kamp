# Design Document: To-Do List Life Dashboard

## Overview

The To-Do List Life Dashboard is a single-page web application built with HTML, CSS, and Vanilla JavaScript — no frameworks, no build tools, no server. It runs entirely in the browser and uses `localStorage` as its sole persistence layer.

The page is organized into four independent widgets arranged in a responsive grid:

- **Clock** — live date and time display
- **To-Do List** — task management with add / complete / delete
- **Focus Timer** — Pomodoro-style countdown with configurable work/break durations
- **Quick Links Panel** — user-defined shortcut links to external URLs

Each widget manages its own DOM, state, and interactions. A thin shared layer handles `localStorage` serialization and cross-widget coordination (e.g., announcing changes to screen readers).

---

## Architecture

### Design Principles

- **Module-per-widget**: Each widget lives in its own logical module (either a class or a plain object with init/render methods). Modules communicate only through the shared `AppState` object and a lightweight event emitter, not by reaching into each other's DOM.
- **State → DOM**: All rendering flows one way — state changes first, then the DOM is updated to reflect state. No DOM is read back to infer state.
- **Persistence is a side effect**: Saving to `localStorage` is triggered by state mutations, not by individual user actions. A single `persistState()` function serializes the full `Dashboard_State` object.
- **Progressive enhancement**: The page is usable without JavaScript for reading content (clock shows a placeholder, lists show stored content), though interactivity requires JS.

### File Structure

```
index.html          ← single HTML file; widget markup shells, aria regions
styles.css          ← all visual styles; CSS custom properties for theming
app.js              ← entry point; bootstraps all modules after DOM load
```

The three files mirror the existing project convention. All widget logic lives in `app.js` as self-contained IIFE modules or plain object namespaces.

### Module Breakdown

```
app.js
├── AppState          — central mutable state object
├── Storage           — localStorage read/write with error handling
├── EventBus          — minimal pub/sub for cross-widget notifications
├── ClockWidget       — date/time display, setInterval, visibility API
├── TodoWidget        — task CRUD, validation, empty/count states
├── TimerWidget       — countdown logic, session switching, audio alert
├── LinksWidget       — quick link CRUD, URL validation
└── init()            — called on DOMContentLoaded; wires everything up
```

### Data Flow

```
User Action
    │
    ▼
Widget handler mutates AppState.<section>
    │
    ├──► Widget re-renders its DOM section
    │
    ├──► Storage.save(AppState)          [debounced, ≤500ms]
    │
    └──► EventBus.emit('stateChange')    [optional, for aria-live updates]
```

---

## Components and Interfaces

### AppState

Central state object. All widgets read from and write to this object. Never accessed from HTML attributes.

```js
const AppState = {
  tasks: [],          // Task[]
  timer: { ... },     // TimerConfig & TimerRuntime
  links: []           // QuickLink[]
};
```

### Storage Module

Responsible for all `localStorage` interaction. Uses a single key `"dashboardState"`.

```js
const Storage = {
  KEY: 'dashboardState',

  // Reads and parses Dashboard_State from localStorage.
  // Returns null and shows a notification on failure.
  load()  { ... },

  // Serializes AppState and writes it. Shows a notification on write failure.
  // Debounced so writes are batched within 500ms.
  save(state) { ... }
};
```

### EventBus Module

Lightweight pub/sub for decoupled aria-live announcements.

```js
const EventBus = {
  listeners: {},
  on(event, fn)  { ... },
  emit(event, data) { ... }
};
```

### ClockWidget

```js
const ClockWidget = {
  el: null,             // root DOM element
  intervalId: null,

  init(rootEl) { ... }, // starts the 1-second interval, hooks visibilitychange
  tick()       { ... }, // reads Date(), updates DOM
  render(date) { ... }, // formats and writes HH:MM:SS and date string
  formatTime(d){ ... }, // returns "HH:MM:SS" string
  formatDate(d){ ... }  // returns "Weekday, Month DD, YYYY" string
};
```

### TodoWidget

```js
const TodoWidget = {
  init(rootEl) { ... },
  addTask(text)     { ... },   // validates, mutates AppState.tasks, re-renders
  toggleTask(id)    { ... },   // flips completion state
  deleteTask(id)    { ... },   // removes from AppState.tasks
  clearCompleted()  { ... },   // filters out completed tasks
  render()          { ... },   // full re-render of task list DOM
  renderCount()     { ... },   // updates the count display and aria-live region
  validate(text)    { ... }    // returns { valid: bool, error: string|null }
};
```

### TimerWidget

```js
const TimerWidget = {
  init(rootEl) { ... },
  start()      { ... },   // begins or resumes countdown
  pause()      { ... },   // freezes remaining time
  reset()      { ... },   // stops, resets to work session at full duration
  tick()       { ... },   // called every second; decrements, checks for zero
  switchSession() { ... },// flips work↔break, emits beep, arms paused state
  playAlert()  { ... },   // synthesizes a 1-3s tone via Web Audio API
  render()     { ... },   // updates MM:SS display, session label, button states
  setWorkDuration(mins)  { ... },
  setBreakDuration(mins) { ... },
  validateDuration(val)  { ... }  // returns { valid: bool, error: string|null }
};
```

### LinksWidget

```js
const LinksWidget = {
  init(rootEl) { ... },
  addLink(label, url)  { ... },  // validates, mutates AppState.links, re-renders
  deleteLink(id)       { ... },  // removes from AppState.links
  render()             { ... },  // re-renders link list
  validate(label, url) { ... }   // returns { valid: bool, errors: string[] }
};
```

---

## Data Models

### Task

```js
/**
 * @typedef {Object} Task
 * @property {string}  id        - UUID v4 (crypto.randomUUID or Date.now() fallback)
 * @property {string}  text      - Task description, 1–200 characters
 * @property {boolean} completed - false = incomplete, true = complete
 * @property {number}  createdAt - Unix timestamp (ms) when the task was added
 */
```

### TimerConfig (persisted)

```js
/**
 * @typedef {Object} TimerConfig
 * @property {number} workDuration  - Work session length in minutes, 1–60 (default 25)
 * @property {number} breakDuration - Break session length in minutes, 1–60 (default 5)
 */
```

### TimerRuntime (not persisted — reset on load)

```js
/**
 * @typedef {Object} TimerRuntime
 * @property {'work'|'break'} sessionType - Current session type
 * @property {number}  remaining   - Seconds remaining in the current session
 * @property {'idle'|'running'|'paused'} status
 * @property {number|null} intervalId
 */
```

### QuickLink

```js
/**
 * @typedef {Object} QuickLink
 * @property {string} id    - UUID v4
 * @property {string} label - Display label, 1–50 characters
 * @property {string} url   - Full URL beginning with http:// or https://
 */
```

### Dashboard_State (persisted to localStorage)

```js
/**
 * @typedef {Object} DashboardState
 * @property {Task[]}       tasks  - Full task list in insertion order
 * @property {TimerConfig}  timer  - Work and break durations only
 * @property {QuickLink[]}  links  - All quick links in insertion order
 */
```

Example JSON written to `localStorage["dashboardState"]`:

```json
{
  "tasks": [
    { "id": "abc123", "text": "Read chapter 3", "completed": false, "createdAt": 1720000000000 }
  ],
  "timer": { "workDuration": 25, "breakDuration": 5 },
  "links": [
    { "id": "def456", "label": "GitHub", "url": "https://github.com" }
  ]
}
```

### Validation Rules Summary

| Field               | Rule                                                  |
|---------------------|-------------------------------------------------------|
| Task text           | 1–200 chars, not whitespace-only                      |
| Timer duration      | Integer, 1–60 inclusive                               |
| Link label          | 1–50 chars                                            |
| Link URL            | Must start with `http://` or `https://`               |
| Link count          | Max 20 links                                          |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Whitespace-only task input is always rejected

*For any* string composed entirely of whitespace characters (spaces, tabs, newlines), attempting to add it as a task SHALL leave the task list unchanged and SHALL not create any new Task object.

**Validates: Requirements 2.3**

---

### Property 2: Task text length invariant

*For any* valid task addition (non-empty, ≤200 characters), the task that appears in the task list SHALL have exactly the text that was submitted — no truncation, no modification.

*For any* string exceeding 200 characters, attempting to add it SHALL leave the task list unchanged.

**Validates: Requirements 2.2, 2.4**

---

### Property 3: Task completion toggle round-trip

*For any* task in the task list, toggling its completion state twice SHALL return it to its original state (incomplete → complete → incomplete, or complete → incomplete → complete).

**Validates: Requirements 2.5, 2.6**

---

### Property 4: Clear Completed removes exactly the completed tasks

*For any* task list containing a mix of complete and incomplete tasks, activating "Clear Completed" SHALL remove all and only the tasks whose `completed` property is `true`, leaving all incomplete tasks present and in their original order.

**Validates: Requirements 2.8**

---

### Property 5: Incomplete task count is always accurate

*For any* sequence of add, complete, and delete operations, the displayed incomplete task count SHALL equal the number of Tasks in `AppState.tasks` whose `completed` property is `false`.

**Validates: Requirements 2.10**

---

### Property 6: Timer display always reflects remaining time

*For any* running or paused timer state, the MM:SS display SHALL show exactly `Math.floor(remaining / 60)` zero-padded as MM and `remaining % 60` zero-padded as SS, where `remaining` is the integer seconds left in `AppState.timer.remaining`.

**Validates: Requirements 3.8**

---

### Property 7: Timer duration validation rejects out-of-range values

*For any* input value that is not an integer in [1, 60], the timer duration setter SHALL reject it, leave the previous valid duration unchanged, and produce a non-empty error message.

**Validates: Requirements 3.9, 3.10**

---

### Property 8: Session auto-switch preserves new session type

*For any* completed work session, the timer SHALL switch to a break session; *for any* completed break session, the timer SHALL switch to a work session. In both cases the new session SHALL start in the paused state with remaining time equal to the full configured duration for that session type.

**Validates: Requirements 3.6**

---

### Property 9: Quick link URL validation

*For any* submitted URL that does not start with `http://` or `https://`, the link SHALL be rejected and the panel's link count SHALL be unchanged.

*For any* submitted URL that starts with `http://` or `https://`, the link SHALL be accepted (assuming label and count constraints are also satisfied).

**Validates: Requirements 4.4**

---

### Property 10: Quick links panel enforces maximum count

*For any* state where the panel contains exactly 20 links, any further attempt to add a link SHALL leave the count at 20 and SHALL produce a non-empty error message.

**Validates: Requirements 4.8**

---

### Property 11: Dashboard_State serialization round-trip

*For any* valid `DashboardState` object, serializing it to JSON (`JSON.stringify`) and deserializing it back (`JSON.parse`) SHALL produce a structurally equivalent object — all tasks, timer config, and links preserved with equal field values.

**Validates: Requirements 5.1, 5.2, 5.3, 5.7**

---

### Property 12: Persistence restores full state on load

*For any* `DashboardState` saved to `localStorage`, reloading the page (re-running `Storage.load()`) SHALL restore an `AppState` whose tasks, timer config, and links are deeply equal to the saved state.

**Validates: Requirements 5.4**

---

## Error Handling

### LocalStorage Failures

Two distinct failure modes are handled:

1. **Load failure** (`localStorage` unavailable, quota exceeded on read, or JSON parse error):
   - Initialize `AppState` with empty tasks, empty links, and default timer durations (25/5).
   - Display a non-blocking banner notification: "Your saved data could not be loaded. Starting fresh."
   - The notification is dismissible and does not block interaction.

2. **Save failure** (write throws `QuotaExceededError` or `SecurityError`):
   - Display a non-blocking banner: "Changes could not be saved. Your data may not persist."
   - Continue operating in-memory; do not revert the state change.

Both notifications use `role="status"` and `aria-live="polite"` so screen readers announce them without interrupting the user.

### Input Validation Errors

All validation errors are displayed inline, adjacent to the triggering input, using `role="alert"` so they are announced immediately. They are cleared when the user modifies the input.

### Timer Audio Fallback

The audible end-of-session alert is synthesized via the Web Audio API (`AudioContext` → `OscillatorNode`). If `AudioContext` is unavailable (e.g., blocked by browser policy), the alert is silently skipped — the session still switches automatically. No visible error is shown for audio failure.

### Invalid Stored Data

On load, if the parsed `localStorage` value is missing fields or has type mismatches (e.g., `tasks` is not an array), the Storage module falls back to defaults for the affected section rather than crashing. A console warning is emitted.

---

## Testing Strategy

### Overview

This project uses a dual testing approach:

- **Unit tests** for specific examples, edge cases, validation logic, and pure functions.
- **Property-based tests** for universal behavioral invariants across wide input spaces.

The existing test file is `tests/unit.test.js`. Tests are written in plain JavaScript using a minimal test runner compatible with the no-build-tool constraint (or via a script tag in a test HTML harness).

### Recommended Test Library

**fast-check** (via CDN or npm) for property-based tests — it is the most mature JS PBT library and works without a build step when loaded as a module. Alternatively, **jest** with **fast-check** for a full runner if a lightweight build step is acceptable.

### Unit Tests

Focus on concrete examples and edge cases:

- Clock formatter returns `"--:--:--"` when `Date` throws.
- Clock formatter produces correct zero-padded string for midnight (`"00:00:00"`).
- `validate()` in `TodoWidget` rejects empty string, rejects 201-char string, accepts 1-char string, accepts 200-char string.
- `validate()` in `LinksWidget` rejects `ftp://` URL, rejects missing label, rejects label > 50 chars, accepts `https://` URL.
- `TimerWidget.formatTime(0)` returns `"00:00"`, `formatTime(3661)` is handled correctly.
- `Storage.load()` returns default state when `localStorage` is empty.
- `Storage.load()` returns default state and does not throw when JSON is malformed.
- `TodoWidget.clearCompleted()` on a list with no completed tasks leaves the list unchanged.

### Property-Based Tests

Each property below maps directly to a Correctness Property above. Each test MUST run a minimum of **100 iterations** and be tagged with a comment referencing the design property.

```
// Feature: todo-life-dashboard, Property 1: Whitespace-only input rejected
// Feature: todo-life-dashboard, Property 2: Task text length invariant
// Feature: todo-life-dashboard, Property 3: Completion toggle round-trip
// Feature: todo-life-dashboard, Property 4: Clear Completed exact removal
// Feature: todo-life-dashboard, Property 5: Incomplete count accuracy
// Feature: todo-life-dashboard, Property 6: Timer MM:SS display accuracy
// Feature: todo-life-dashboard, Property 7: Timer duration validation
// Feature: todo-life-dashboard, Property 8: Session auto-switch
// Feature: todo-life-dashboard, Property 9: Link URL validation
// Feature: todo-life-dashboard, Property 10: Max 20 links enforced
// Feature: todo-life-dashboard, Property 11: State serialization round-trip
// Feature: todo-life-dashboard, Property 12: Persistence restore
```

**Generator guidance:**

- Task text: `fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)`
- Whitespace strings: `fc.stringOf(fc.constantFrom(' ', '\t', '\n'))`
- Timer minutes: `fc.integer({ min: 1, max: 60 })`
- Invalid timer values: `fc.oneof(fc.float(), fc.string(), fc.integer({ min: 61 }), fc.integer({ max: 0 }))`
- URLs: `fc.oneof(fc.constant('http://'), fc.constant('https://')).chain(prefix => fc.webUrl().map(u => prefix + u.replace(/^https?:\/\//, '')))`
- Invalid URLs: `fc.string().filter(s => !s.startsWith('http://') && !s.startsWith('https://'))`
- Link labels: `fc.string({ minLength: 1, maxLength: 50 })`
- Task lists: `fc.array(fc.record({ id: fc.uuidV(4), text: fc.string({ minLength: 1, maxLength: 200 }), completed: fc.boolean(), createdAt: fc.integer({ min: 0 }) }))`

### Integration / Smoke Tests

These are verified manually or with a single-execution test (not property-based):

- Page loads with no `localStorage` data → all four widgets render with empty states and default timer values.
- Page loads with seeded `localStorage` data → tasks, links, and timer config are restored correctly.
- Resizing the viewport below 768px triggers single-column layout (visual check).
- All interactive controls are reachable via Tab key (manual keyboard walkthrough).
- Screen reader announces task count change on add/delete (manual test with NVDA or VoiceOver).

### Accessibility Testing

Full WCAG 2.1 AA validation requires manual testing with assistive technologies and expert accessibility review. Automated checks (e.g., axe-core) can catch contrast violations and missing aria labels but are not a substitute for manual testing.
