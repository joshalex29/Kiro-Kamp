# Implementation Plan: To-Do List Life Dashboard

## Overview

Build a single-page personal dashboard in plain HTML, CSS, and Vanilla JavaScript. Implementation proceeds from the static shell outward: HTML structure and CSS custom properties first, then shared modules (`AppState`, `Storage`, `EventBus`), then each widget, then persistence wiring, and finally accessibility polish. No build tools are used; all JavaScript lives in `app.js`.

---

## Tasks

- [x] 1. Scaffold HTML structure and CSS foundation
  - [x] 1.1 Write the full `index.html` shell with four `<section>` widget regions
    - Add semantic landmark elements: `<header>`, `<main>`, four `<section>` elements with `id` attributes (`clock-widget`, `todo-widget`, `timer-widget`, `links-widget`)
    - Include `aria-label` on each section, a single `<div id="notification-banner">` for persistent notifications, and a visually hidden `<div aria-live="polite" id="aria-announcer">` for screen reader announcements
    - Link `styles.css` in `<head>` and `app.js` as a deferred `<script>` before `</body>`
    - _Requirements: 6.1, 7.1, 7.2, 7.3_

  - [x] 1.2 Write the complete `styles.css` with CSS custom properties and responsive grid
    - Define `:root` CSS custom properties for colors, spacing, font sizes, and border radii
    - Implement a two-column CSS Grid layout for viewports ≥ 768 px and single-column stacked layout for viewports < 768 px using a single `@media` query
    - Add base widget card styles (padding, border, shadow, scroll containment), visible focus indicator styles (`:focus-visible` outline), and strikethrough style for completed tasks
    - Add color contrast compliant text/background pairs meeting WCAG 2.1 AA 4.5:1 ratio
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.5_

- [x] 2. Implement shared core modules in `app.js`
  - [x] 2.1 Implement `AppState` and `Storage` module
    - Define the `AppState` object literal with `tasks: []`, `timer: { workDuration: 25, breakDuration: 5, sessionType: 'work', remaining: 1500, status: 'idle', intervalId: null }`, and `links: []`
    - Implement `Storage.KEY`, `Storage.load()` (parse JSON, validate field types, fall back to defaults per field on type mismatch, emit console warning, show banner on total failure), and `Storage.save(state)` (debounced ≤ 500 ms, catch `QuotaExceededError`/`SecurityError` and show banner)
    - _Requirements: 5.4, 5.5, 5.6, 5.7_

  - [x] 2.2 Write property test for `Storage` serialization round-trip
    - **Property 11: Dashboard_State serialization round-trip** — for any valid `DashboardState`, `JSON.parse(JSON.stringify(state))` produces a structurally equal object
    - **Property 12: Persistence restores full state on load** — `Storage.load()` after `Storage.save(state)` returns deeply equal state
    - Tag: `// Feature: todo-life-dashboard, Property 11`, `// Feature: todo-life-dashboard, Property 12`
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.7**

  - [x] 2.3 Implement `EventBus` module
    - Implement `EventBus.listeners`, `EventBus.on(event, fn)`, and `EventBus.emit(event, data)` as a plain object
    - _Requirements: 7.3, 7.4_

- [x] 3. Implement ClockWidget
  - [x] 3.1 Write ClockWidget HTML fragment and ClockWidget module
    - Add time (`<time id="clock-time">`) and date (`<p id="clock-date">`) elements inside `#clock-widget` in `index.html`
    - Implement `ClockWidget.init(rootEl)` (starts 1 s `setInterval`, hooks `visibilitychange` to call `tick()` immediately on visibility restore), `ClockWidget.tick()`, `ClockWidget.render(date)`, `ClockWidget.formatTime(d)` (zero-padded HH:MM:SS, returns `"--:--:--"` on invalid date), and `ClockWidget.formatDate(d)` (weekday, full month name, day, 4-digit year)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 3.2 Write unit tests for ClockWidget formatters
    - Test `formatTime` returns `"--:--:--"` when `Date` is invalid
    - Test `formatTime` returns `"00:00:00"` for midnight
    - Test `formatDate` returns correct weekday/month/day/year for a known date
    - _Requirements: 1.1, 1.5_

- [x] 4. Implement TodoWidget
  - [x] 4.1 Write TodoWidget HTML fragment
    - Inside `#todo-widget` in `index.html`: add `<form id="todo-form">` with a text `<input id="todo-input">`, a submit button, and a `<p id="todo-error" role="alert">` for inline validation messages
    - Add `<p id="todo-count" aria-live="polite">` for incomplete count, an empty-state `<p id="todo-empty">` message, `<ul id="todo-list">`, and a `<button id="clear-completed">` control
    - _Requirements: 2.1, 2.3, 2.4, 2.9, 2.10, 2.11, 7.2, 7.4_

  - [x] 4.2 Implement `TodoWidget` module
    - Implement `init(rootEl)`, `addTask(text)` (validates, generates UUID via `crypto.randomUUID()` with `Date.now()` fallback, mutates `AppState.tasks`, calls `render()` and `Storage.save()`), `toggleTask(id)`, `deleteTask(id)`, `clearCompleted()`, `render()` (full DOM re-render; shows/hides empty state and "Clear Completed"; each task `<li>` has a toggle checkbox, text `<span>`, and delete `<button>`), `renderCount()` (updates `#todo-count` text and emits `EventBus` event for aria announcer), and `validate(text)` (returns `{ valid, error }`)
    - Disable "Clear Completed" when no completed tasks exist; hide when task list is empty
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11_

  - [x] 4.3 Write property tests for TodoWidget
    - **Property 1: Whitespace-only input is always rejected** — `addTask(whitespaceStr)` leaves `AppState.tasks.length` unchanged
    - Tag: `// Feature: todo-life-dashboard, Property 1` — **Validates: Requirements 2.3**
    - **Property 2: Task text length invariant** — valid text is stored verbatim; text > 200 chars is rejected
    - Tag: `// Feature: todo-life-dashboard, Property 2` — **Validates: Requirements 2.2, 2.4**
    - **Property 3: Completion toggle round-trip** — toggling twice returns task to original state
    - Tag: `// Feature: todo-life-dashboard, Property 3` — **Validates: Requirements 2.5, 2.6**
    - **Property 4: Clear Completed removes exactly completed tasks** — incomplete tasks survive in original order
    - Tag: `// Feature: todo-life-dashboard, Property 4` — **Validates: Requirements 2.8**
    - **Property 5: Incomplete count is always accurate** — count equals `AppState.tasks.filter(t => !t.completed).length`
    - Tag: `// Feature: todo-life-dashboard, Property 5` — **Validates: Requirements 2.10**

  - [x] 4.4 Write unit tests for TodoWidget
    - Test `validate('')` returns `{ valid: false }`
    - Test `validate('a'.repeat(201))` returns `{ valid: false }`
    - Test `validate('a')` and `validate('a'.repeat(200))` return `{ valid: true }`
    - Test `clearCompleted()` on a list with no completed tasks leaves list unchanged
    - _Requirements: 2.2, 2.3, 2.4, 2.8_

- [x] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement TimerWidget
  - [x] 6.1 Write TimerWidget HTML fragment
    - Inside `#timer-widget` in `index.html`: add `<p id="timer-session">` for session label, `<p id="timer-display" aria-live="polite">` for MM:SS countdown, start/pause/reset `<button>` elements, and two `<input type="number">` fields with associated `<label>` elements and `<p role="alert">` siblings for work/break duration inputs
    - _Requirements: 3.1, 3.7, 3.8, 3.9, 3.10, 7.2, 7.3_

  - [x] 6.2 Implement `TimerWidget` module
    - Implement `init(rootEl)`, `start()`, `pause()`, `reset()`, `tick()` (decrements `AppState.timer.remaining`, calls `switchSession()` at zero), `switchSession()` (flips `sessionType`, resets `remaining` to full new-session duration, sets `status` to `'paused'`, calls `playAlert()`), `playAlert()` (1–3 s tone via `AudioContext → OscillatorNode`; silently skips if `AudioContext` unavailable), `render()` (MM:SS display, session label, button enabled/disabled states), `setWorkDuration(mins)` and `setBreakDuration(mins)` (validate, update `AppState.timer`, call `Storage.save()`; apply only at next session start per requirement 3.11), and `validateDuration(val)`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_

  - [x] 6.3 Write property tests for TimerWidget
    - **Property 6: Timer display always reflects remaining time** — `render()` output matches `Math.floor(r/60)` and `r % 60` for any `remaining` value
    - Tag: `// Feature: todo-life-dashboard, Property 6` — **Validates: Requirements 3.8**
    - **Property 7: Duration validation rejects out-of-range values** — any non-integer or value outside [1, 60] is rejected with a non-empty error and previous duration unchanged
    - Tag: `// Feature: todo-life-dashboard, Property 7` — **Validates: Requirements 3.9, 3.10**
    - **Property 8: Session auto-switch preserves new session type** — work→break and break→work each start paused at full new-session duration
    - Tag: `// Feature: todo-life-dashboard, Property 8` — **Validates: Requirements 3.6**

  - [x] 6.4 Write unit tests for TimerWidget
    - Test `validateDuration(0)`, `validateDuration(61)`, `validateDuration(1.5)`, `validateDuration('abc')` all return `{ valid: false }`
    - Test `validateDuration(1)` and `validateDuration(60)` return `{ valid: true }`
    - Test `formatTime(0)` returns `"00:00"` and `formatTime(3661)` is formatted correctly
    - _Requirements: 3.8, 3.9, 3.10_

- [x] 7. Implement LinksWidget
  - [x] 7.1 Write LinksWidget HTML fragment
    - Inside `#links-widget` in `index.html`: add `<form id="links-form">` with label `<input>`, URL `<input>`, submit button, and `<p role="alert">` for inline errors; an empty-state `<p id="links-empty">`; and `<ul id="links-list">` where each link renders as `<li>` containing an `<a target="_blank" rel="noopener noreferrer">` and a delete `<button>`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 7.2_

  - [x] 7.2 Implement `LinksWidget` module
    - Implement `init(rootEl)`, `addLink(label, url)` (validates, mutates `AppState.links`, re-renders, saves), `deleteLink(id)`, `render()` (full re-render; shows/hides empty state), and `validate(label, url)` (checks label 1–50 chars, URL starts with `http://` or `https://`, total count ≤ 20; returns `{ valid, errors: string[] }`)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [x] 7.3 Write property tests for LinksWidget
    - **Property 9: URL validation** — any URL not starting with `http://` or `https://` is rejected; any conforming URL is accepted (given other constraints satisfied)
    - Tag: `// Feature: todo-life-dashboard, Property 9` — **Validates: Requirements 4.4**
    - **Property 10: Max 20 links enforced** — when panel has exactly 20 links, any add attempt leaves count at 20 and produces non-empty error
    - Tag: `// Feature: todo-life-dashboard, Property 10` — **Validates: Requirements 4.8**

  - [x] 7.4 Write unit tests for LinksWidget
    - Test `validate('', 'https://x.com')` fails with missing-label error
    - Test `validate('GitHub', 'ftp://github.com')` fails with invalid-URL error
    - Test `validate('GitHub', '')` fails with missing-URL error
    - Test `validate('a'.repeat(51), 'https://x.com')` fails with label-too-long error
    - Test `validate('GitHub', 'https://github.com')` returns `{ valid: true }`
    - _Requirements: 4.3, 4.4, 4.5_

- [x] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Wire persistence and `init()`
  - [x] 9.1 Implement `init()` and persistence wiring in `app.js`
    - Write the `init()` function called on `DOMContentLoaded`: call `Storage.load()`, merge loaded state into `AppState`, then call `ClockWidget.init()`, `TodoWidget.init()`, `TimerWidget.init()`, and `LinksWidget.init()` in order
    - Hook `EventBus.on('stateChange', ...)` to update the `#aria-announcer` div with the emitted message for screen reader announcements (task count changes, timer session changes)
    - Confirm that every state-mutating method in each widget already calls `Storage.save(AppState)` (debounced); add any missing call sites
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 7.3, 7.4_

  - [x] 9.2 Write integration smoke tests for persistence
    - Test: seed `localStorage["dashboardState"]` with a known fixture, call `Storage.load()`, assert `AppState.tasks`, `AppState.links`, and `AppState.timer` match the fixture
    - Test: call `Storage.load()` with `localStorage` empty → returns default state without throwing
    - Test: call `Storage.load()` with malformed JSON → returns default state without throwing
    - _Requirements: 5.4, 5.5_

- [x] 10. Accessibility and keyboard polish
  - [x] 10.1 Audit and complete ARIA attributes across all widget HTML
    - Ensure every `<button>` has an `aria-label` or descriptive text content ≥ 1 character
    - Ensure `aria-disabled="true"` is set on the "Clear Completed" button when no completed tasks exist, and that the `EventBus` emits a message to the `aria-live="assertive"` region when a disabled control is activated
    - Verify all four widget `<section>` elements have descriptive `aria-label` attributes
    - Add `aria-live="polite"` to the timer display so session/time changes are announced
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6_

  - [x] 10.2 Verify keyboard navigation and focus management
    - Walk through the full Tab order in `index.html` and confirm all interactive controls are reachable without a mouse
    - Confirm `:focus-visible` styles from `styles.css` are applied to every interactive element
    - Confirm no modal or overlay is introduced; if one is added in future, add focus-trap logic (per requirement 7.7)
    - _Requirements: 7.1, 7.7_

- [x] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- The design's 12 Correctness Properties are each covered by a property-based test sub-task
- No build tools, no bundlers — all code runs directly in the browser; tests may use fast-check via CDN or as an npm dev dependency with a minimal test runner
- `TimerRuntime` fields (`sessionType`, `remaining`, `status`, `intervalId`) are NOT persisted — they reset to defaults on each page load (idle work session at full work duration)
- `crypto.randomUUID()` is used for IDs with a `Date.now().toString()` fallback for older browsers

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.3"] },
    { "id": 2, "tasks": ["2.2", "3.1", "4.1", "6.1", "7.1"] },
    { "id": 3, "tasks": ["3.2", "4.2", "6.2", "7.2"] },
    { "id": 4, "tasks": ["4.3", "4.4", "6.3", "6.4", "7.3", "7.4"] },
    { "id": 5, "tasks": ["9.1"] },
    { "id": 6, "tasks": ["9.2", "10.1", "10.2"] }
  ]
}
```
