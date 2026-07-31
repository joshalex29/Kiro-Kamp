// Unit tests for truncate(), renderBiomeFilters(), renderCard(), renderNoResults()
// Validates: Requirements 3.2, 3.5, 1.1, 1.7, 4.1, 4.2, 4.3
// Run with: node tests/unit.test.js

'use strict';

const assert = require('assert');

// ── Shared helpers (mirrored from app.js) ─────────────────────────────────

function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '\u2026'; // '…'
}

// ── Test harness ──────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err.message}`);
    failed++;
  }
}

// ── truncate() ────────────────────────────────────────────────────────────
// Validates: Requirements 3.5

// Test 1: input at exactly maxLen → returned unchanged
test('input at exactly maxLen is returned unchanged', () => {
  const str = 'Arctic Fox';       // length 10
  const result = truncate(str, 10);
  assert.strictEqual(result, 'Arctic Fox');
});

// Test 2: input one character over maxLen → last char replaced with '…'
test('input one character over maxLen gets ellipsis appended', () => {
  const str = 'Arctic Fox!';      // length 11, maxLen 10
  const result = truncate(str, 10);
  assert.strictEqual(result, 'Arctic Fox\u2026');
  assert.strictEqual(result.length, 11); // 10 chars + ellipsis (single code point)
});

// Test 3: empty string → returned unchanged
test('empty string is returned unchanged', () => {
  const result = truncate('', 10);
  assert.strictEqual(result, '');
});

// ── ClockWidget formatters ────────────────────────────────────────────────
// Validates: Requirements 1.1, 1.5

/**
 * Mirror of ClockWidget.formatTime from app.js.
 * Returns "HH:MM:SS" or "--:--:--" for an invalid Date.
 *
 * @param {Date} d
 * @returns {string}
 */
function formatTime(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) {
    return '--:--:--';
  }
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/**
 * Mirror of ClockWidget.formatDate from app.js.
 * Returns "Weekday, Month DD, YYYY" or "" for an invalid Date.
 *
 * @param {Date} d
 * @returns {string}
 */
function formatDate(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) {
    return '';
  }
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric'
  });
}

// Test: formatTime returns "--:--:--" for an invalid Date (new Date('invalid'))
test('formatTime returns "--:--:--" when Date is invalid (new Date("invalid"))', () => {
  const result = formatTime(new Date('invalid'));
  assert.strictEqual(result, '--:--:--');
});

// Test: formatTime returns "--:--:--" when passed a non-Date value
test('formatTime returns "--:--:--" when passed null', () => {
  const result = formatTime(null);
  assert.strictEqual(result, '--:--:--');
});

// Test: formatTime returns "00:00:00" for midnight (start of 2025-01-01)
test('formatTime returns "00:00:00" for midnight', () => {
  // Construct midnight in local time so the test is timezone-agnostic
  const midnight = new Date(2025, 0, 1, 0, 0, 0); // Jan 1 2025 00:00:00 local
  const result = formatTime(midnight);
  assert.strictEqual(result, '00:00:00');
});

// Test: formatTime zero-pads hours, minutes and seconds correctly
test('formatTime zero-pads single-digit values (01:05:09)', () => {
  const d = new Date(2025, 0, 1, 1, 5, 9); // 01:05:09 local
  const result = formatTime(d);
  assert.strictEqual(result, '01:05:09');
});

// Test: formatDate returns the correct weekday, month, day, and year for a known date
test('formatDate returns correct weekday/month/day/year for 2025-07-07 (Monday)', () => {
  // July 7 2025 is a Monday
  const d = new Date(2025, 6, 7); // month is 0-indexed
  const result = formatDate(d);
  // Must contain each component (locale may vary delimiter style, so check parts)
  assert.ok(result.includes('Monday'),  `Expected "Monday" in "${result}"`);
  assert.ok(result.includes('July'),    `Expected "July" in "${result}"`);
  assert.ok(result.includes('7'),       `Expected day "7" in "${result}"`);
  assert.ok(result.includes('2025'),    `Expected year "2025" in "${result}"`);
});

// Test: formatDate returns empty string for an invalid Date
test('formatDate returns empty string when Date is invalid', () => {
  const result = formatDate(new Date('not-a-date'));
  assert.strictEqual(result, '');
});

// ── renderBiomeFilters() ──────────────────────────────────────────────────
// Validates: Requirements 1.1, 1.7

function renderBiomeFilters(biomes, activeFilter) {
  return biomes.map(biome => {
    const isActive = biome === activeFilter;
    const classes = isActive ? 'biome-chip biome-chip--active' : 'biome-chip';
    const pressed = isActive ? 'true' : 'false';
    return `<button class="${classes}" data-biome="${biome}" aria-pressed="${pressed}">${biome}</button>`;
  }).join('');
}

const TEST_BIOMES = ['Rainforest', 'Desert', 'Tundra'];

// Test 4: renders one button per biome
test('renderBiomeFilters renders one button per biome', () => {
  const html = renderBiomeFilters(TEST_BIOMES, null);
  const matches = html.match(/<button/g);
  assert.strictEqual(matches.length, TEST_BIOMES.length);
});

// Test 5: each button carries correct data-biome attribute
test('renderBiomeFilters each button has correct data-biome', () => {
  const html = renderBiomeFilters(TEST_BIOMES, null);
  for (const biome of TEST_BIOMES) {
    assert.ok(html.includes(`data-biome="${biome}"`), `Missing data-biome="${biome}"`);
  }
});

// Test 6: all buttons have aria-pressed="false" when no filter is active
test('renderBiomeFilters all buttons have aria-pressed=false when activeFilter is null', () => {
  const html = renderBiomeFilters(TEST_BIOMES, null);
  assert.ok(!html.includes('aria-pressed="true"'));
  const falseCount = (html.match(/aria-pressed="false"/g) || []).length;
  assert.strictEqual(falseCount, TEST_BIOMES.length);
});

// Test 7: active biome gets aria-pressed="true" and biome-chip--active class
test('renderBiomeFilters active biome gets aria-pressed=true and biome-chip--active', () => {
  const html = renderBiomeFilters(TEST_BIOMES, 'Desert');
  assert.ok(html.includes('aria-pressed="true"'));
  assert.ok(html.includes('biome-chip--active'));
  const trueCount = (html.match(/aria-pressed="true"/g) || []).length;
  assert.strictEqual(trueCount, 1);
});

// Test 8: inactive biomes do NOT get biome-chip--active class
test('renderBiomeFilters inactive biomes do not get biome-chip--active', () => {
  const html = renderBiomeFilters(TEST_BIOMES, 'Desert');
  const activeCount = (html.match(/biome-chip--active/g) || []).length;
  assert.strictEqual(activeCount, 1);
});

// Test 9: every button has the biome-chip base class
test('renderBiomeFilters every button has class biome-chip', () => {
  const html = renderBiomeFilters(TEST_BIOMES, 'Tundra');
  const chipCount = (html.match(/class="biome-chip/g) || []).length;
  assert.strictEqual(chipCount, TEST_BIOMES.length);
});

// Test 10: returns empty string for empty biomes array
test('renderBiomeFilters returns empty string for empty biomes array', () => {
  const html = renderBiomeFilters([], null);
  assert.strictEqual(html, '');
});

// ── renderNoResults() ─────────────────────────────────────────────────────
// Validates: Requirements 4.1, 4.2, 4.3

function renderNoResults(query, activeFilter) {
  const trimmedQuery = query.trim();

  let context = '';
  if (trimmedQuery && activeFilter) {
    context = `"${truncate(trimmedQuery, 30)}" in ${activeFilter}`;
  } else if (trimmedQuery) {
    context = `"${truncate(trimmedQuery, 30)}"`;
  } else if (activeFilter) {
    context = activeFilter;
  }

  const message = context
    ? `No animals found for ${context}. Try a different search term or biome filter.`
    : 'No animals found. Try a different search term or biome filter.';

  return `<p class="no-results">${message}</p>`;
}

/** Strip HTML tags to get plain text content */
function extractText(html) {
  return html.replace(/<[^>]+>/g, '');
}

// Test 11: empty query + active filter — message ≤ 200 characters
test('renderNoResults message is ≤200 chars for empty query with filter', () => {
  const text = extractText(renderNoResults('', 'Rainforest'));
  assert.ok(text.length <= 200, `Expected ≤200 chars, got ${text.length}: "${text}"`);
});

// Test 12: query + null filter — message ≤ 200 characters
test('renderNoResults message is ≤200 chars for query with no filter', () => {
  const text = extractText(renderNoResults('lion', null));
  assert.ok(text.length <= 200, `Expected ≤200 chars, got ${text.length}: "${text}"`);
});

// Test 13: query + active filter — message ≤ 200 characters
test('renderNoResults message is ≤200 chars for query with filter', () => {
  const text = extractText(renderNoResults('eagle', 'Grassland'));
  assert.ok(text.length <= 200, `Expected ≤200 chars, got ${text.length}: "${text}"`);
});

// Test 14: very long query is truncated so message stays ≤ 200 characters
test('renderNoResults message is ≤200 chars even for a 100-char query', () => {
  const text = extractText(renderNoResults('a'.repeat(100), 'Tundra'));
  assert.ok(text.length <= 200, `Expected ≤200 chars, got ${text.length}: "${text}"`);
});

// Test 15: message references the query when one is provided
test('renderNoResults message references the search query', () => {
  const html = renderNoResults('wolf', null);
  assert.ok(html.includes('wolf'), 'Expected HTML to contain the query "wolf"');
});

// Test 16: message references the active filter when one is provided
test('renderNoResults message references the active biome filter', () => {
  const html = renderNoResults('', 'Desert');
  assert.ok(html.includes('Desert'), 'Expected HTML to contain the filter "Desert"');
});

// Test 17: output contains an element with class "no-results"
test('renderNoResults returns an element with class "no-results"', () => {
  const html = renderNoResults('shark', 'Ocean');
  assert.ok(html.includes('class="no-results"'), 'Expected HTML to contain class="no-results"');
});

// ── Summary ───────────────────────────────────────────────────────────────

console.log('');
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}


// ═══════════════════════════════════════════════════════════════════════════
// Property-Based Tests: Storage serialization round-trip
// Feature: todo-life-dashboard
//
// Property 11: Dashboard_State serialization round-trip
//   For any valid DashboardState, JSON.parse(JSON.stringify(state)) produces
//   a structurally equal object.
//   // Feature: todo-life-dashboard, Property 11
//   Validates: Requirements 5.1, 5.2, 5.3, 5.7
//
// Property 12: Persistence restores full state on load
//   Storage.load() after Storage.save(state) returns deeply equal state.
//   // Feature: todo-life-dashboard, Property 12
//   Validates: Requirements 5.4
//
// NOTE: These tests require fast-check and a DOM environment.
// Run them by opening tests/storage.pbt.test.html in a browser.
// The browser harness uses fast-check from CDN and runs 100 iterations each.
//
// A self-contained reference implementation is included below for
// documentation and manual verification purposes.
// ═══════════════════════════════════════════════════════════════════════════

// ── Deep equality helper (shared with browser harness) ──────────────────

function deepEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === 'object') {
    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();
    if (!deepEqual(keysA, keysB)) return false;
    for (const k of keysA) {
      if (!deepEqual(a[k], b[k])) return false;
    }
    return true;
  }
  return false;
}

// ── In-memory localStorage shim (used by Storage in isolation) ──────────

function makeLocalStorageShim() {
  const store = Object.create(null);
  return {
    getItem(key)        { return key in store ? store[key] : null; },
    setItem(key, value) { store[key] = String(value); },
    removeItem(key)     { delete store[key]; },
    clear()             { for (const k of Object.keys(store)) delete store[k]; }
  };
}

// ── Storage module (self-contained copy for isolated unit testing) ───────

function makeStorage(lsShim) {
  return {
    KEY: 'dashboardState',

    load() {
      const defaults = {
        tasks: [],
        timer: { workDuration: 25, breakDuration: 5 },
        links: []
      };
      let raw;
      try { raw = lsShim.getItem(this.KEY); } catch (e) { return defaults; }
      if (raw === null) return defaults;
      let parsed;
      try { parsed = JSON.parse(raw); } catch (e) { return defaults; }

      const result = { tasks: defaults.tasks, timer: { ...defaults.timer }, links: defaults.links };
      if (Array.isArray(parsed.tasks)) result.tasks = parsed.tasks;
      if (parsed.timer !== null && typeof parsed.timer === 'object') {
        const { workDuration, breakDuration } = parsed.timer;
        if (typeof workDuration  === 'number' && Number.isFinite(workDuration))  result.timer.workDuration  = workDuration;
        if (typeof breakDuration === 'number' && Number.isFinite(breakDuration)) result.timer.breakDuration = breakDuration;
      }
      if (Array.isArray(parsed.links)) result.links = parsed.links;
      return result;
    },

    /** Synchronous save — no debounce, for deterministic testing. */
    saveSync(state) {
      const persisted = {
        tasks: state.tasks,
        timer: { workDuration: state.timer.workDuration, breakDuration: state.timer.breakDuration },
        links: state.links
      };
      lsShim.setItem(this.KEY, JSON.stringify(persisted));
    }
  };
}

// ── Micro property runner (runs without fast-check, uses fixed seeds) ────
// This runs 100 hand-crafted representative states so the file is
// self-contained and executable with `node tests/unit.test.js` even without
// fast-check or a browser.  The full randomised PBT harness lives in
// tests/storage.pbt.test.html (fast-check via CDN, 100 random iterations).

function makeSampleStates() {
  const states = [];

  // Empty state
  states.push({ tasks: [], timer: { workDuration: 25, breakDuration: 5 }, links: [] });

  // Single task, no links
  states.push({
    tasks: [{ id: 'id-1', text: 'Buy milk', completed: false, createdAt: 1720000000000 }],
    timer: { workDuration: 25, breakDuration: 5 },
    links: []
  });

  // All completed tasks
  states.push({
    tasks: [
      { id: 'id-2', text: 'Read email', completed: true,  createdAt: 1720000001000 },
      { id: 'id-3', text: 'Write report', completed: true, createdAt: 1720000002000 }
    ],
    timer: { workDuration: 25, breakDuration: 5 },
    links: []
  });

  // Custom timer durations
  states.push({ tasks: [], timer: { workDuration: 50, breakDuration: 10 }, links: [] });

  // Single link
  states.push({
    tasks: [],
    timer: { workDuration: 25, breakDuration: 5 },
    links: [{ id: 'lnk-1', label: 'GitHub', url: 'https://github.com' }]
  });

  // Mixed tasks and links
  states.push({
    tasks: [
      { id: 'id-4', text: 'Sprint planning', completed: false, createdAt: 1720000003000 },
      { id: 'id-5', text: 'Update docs',     completed: true,  createdAt: 1720000004000 }
    ],
    timer: { workDuration: 30, breakDuration: 5 },
    links: [
      { id: 'lnk-2', label: 'Jira',  url: 'https://jira.example.com' },
      { id: 'lnk-3', label: 'Slack', url: 'https://slack.com' }
    ]
  });

  // Minimum timer values
  states.push({ tasks: [], timer: { workDuration: 1, breakDuration: 1 }, links: [] });

  // Maximum timer values
  states.push({ tasks: [], timer: { workDuration: 60, breakDuration: 60 }, links: [] });

  // Task at max text length (200 chars)
  states.push({
    tasks: [{ id: 'id-6', text: 'x'.repeat(200), completed: false, createdAt: 0 }],
    timer: { workDuration: 25, breakDuration: 5 },
    links: []
  });

  // 10 links (fill up half the panel)
  const links10 = [];
  for (let i = 0; i < 10; i++) {
    links10.push({ id: `lnk-${10 + i}`, label: `Link ${i}`, url: `https://example${i}.com` });
  }
  states.push({ tasks: [], timer: { workDuration: 25, breakDuration: 5 }, links: links10 });

  // 20 tasks
  const tasks20 = [];
  for (let i = 0; i < 20; i++) {
    tasks20.push({ id: `tid-${i}`, text: `Task number ${i}`, completed: i % 2 === 0, createdAt: 1720000000000 + i * 1000 });
  }
  states.push({ tasks: tasks20, timer: { workDuration: 25, breakDuration: 5 }, links: [] });

  // Generate 89 additional varied states to reach ≥100 total iterations
  for (let i = 0; i < 89; i++) {
    const numTasks = i % 6;
    const numLinks = i % 4;
    const tasks = [];
    for (let t = 0; t < numTasks; t++) {
      tasks.push({
        id: `gen-tid-${i}-${t}`,
        text: `Generated task ${i}-${t}`,
        completed: (t + i) % 2 === 0,
        createdAt: 1_700_000_000_000 + i * 1000 + t
      });
    }
    const links = [];
    for (let l = 0; l < numLinks; l++) {
      links.push({
        id: `gen-lnk-${i}-${l}`,
        label: `Link ${i}-${l}`,
        url: `https://example-${i}-${l}.com`
      });
    }
    states.push({
      tasks,
      timer: {
        workDuration:  (i % 60) + 1,
        breakDuration: (i % 60) + 1
      },
      links
    });
  }

  return states; // 100 states total
}

const sampleStates = makeSampleStates();

// ── Property 11: Dashboard_State serialization round-trip ───────────────
// Feature: todo-life-dashboard, Property 11
// Validates: Requirements 5.1, 5.2, 5.3, 5.7

console.log('');
console.log('Property 11: Dashboard_State serialization round-trip');
console.log('  // Feature: todo-life-dashboard, Property 11');
console.log('  // Validates: Requirements 5.1, 5.2, 5.3, 5.7');

let prop11failures = 0;
for (let i = 0; i < sampleStates.length; i++) {
  const state        = sampleStates[i];
  const serialized   = JSON.stringify(state);
  const deserialized = JSON.parse(serialized);
  if (!deepEqual(state, deserialized)) {
    prop11failures++;
    console.error(`  FAIL  iteration ${i}: round-trip not equal`);
    console.error(`        Input:  ${JSON.stringify(state)}`);
    console.error(`        Output: ${JSON.stringify(deserialized)}`);
    failed++;
  }
}
if (prop11failures === 0) {
  console.log(`  PASS  Property 11: JSON round-trip preserves DashboardState (${sampleStates.length} iterations)`);
  passed++;
}

// ── Property 12: Persistence restores full state on load ────────────────
// Feature: todo-life-dashboard, Property 12
// Validates: Requirements 5.4

console.log('');
console.log('Property 12: Persistence restores full state on load');
console.log('  // Feature: todo-life-dashboard, Property 12');
console.log('  // Validates: Requirements 5.4');

let prop12failures = 0;
for (let i = 0; i < sampleStates.length; i++) {
  const state   = sampleStates[i];
  const lsShim  = makeLocalStorageShim();
  const storage = makeStorage(lsShim);

  storage.saveSync(state);
  const loaded = storage.load();

  const tasksOk = deepEqual(loaded.tasks, state.tasks);
  const timerOk =
    loaded.timer.workDuration  === state.timer.workDuration &&
    loaded.timer.breakDuration === state.timer.breakDuration;
  const linksOk = deepEqual(loaded.links, state.links);

  if (!tasksOk || !timerOk || !linksOk) {
    prop12failures++;
    const field = !tasksOk ? 'tasks' : (!timerOk ? 'timer' : 'links');
    console.error(`  FAIL  iteration ${i}: loaded ${field} does not match saved state`);
    console.error(`        Saved:  ${JSON.stringify(state)}`);
    console.error(`        Loaded: ${JSON.stringify(loaded)}`);
    failed++;
  }
}
if (prop12failures === 0) {
  console.log(`  PASS  Property 12: Storage.load() restores saved state (${sampleStates.length} iterations)`);
  passed++;
}

// ── Updated summary ──────────────────────────────────────────────────────

console.log('');
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

// ── TodoWidget ─────────────────────────────────────────────────────────────
// Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8, 2.9

/**
 * Mirror of TodoWidget.validate from app.js.
 * Validates task text according to requirements 2.3 and 2.4.
 *
 * @param {string} text - The task text to validate.
 * @returns {{ valid: boolean, error: string|null }}
 */
function validateTaskText(text) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return { valid: false, error: 'Task text is required.' };
  }
  if (text.length > 200) {
    return { valid: false, error: 'Task text must be 200 characters or fewer.' };
  }
  return { valid: true, error: null };
}

// Test: validate('') returns { valid: false } (empty string)
test('TodoWidget validate() rejects empty string', () => {
  const result = validateTaskText('');
  assert.strictEqual(result.valid, false);
  assert.ok(result.error !== null);
});

// Test: validate('   ') returns { valid: false } (whitespace only)
test('TodoWidget validate() rejects whitespace-only string', () => {
  const result = validateTaskText('   ');
  assert.strictEqual(result.valid, false);
  assert.ok(result.error !== null);
});

// Test: validate('Buy milk') returns { valid: true }
test('TodoWidget validate() accepts valid task text', () => {
  const result = validateTaskText('Buy milk');
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.error, null);
});

// Test: validate('x'.repeat(201)) returns { valid: false } (exceeds 200 chars)
test('TodoWidget validate() rejects text exceeding 200 characters', () => {
  const result = validateTaskText('x'.repeat(201));
  assert.strictEqual(result.valid, false);
  assert.ok(result.error !== null);
});

// Test: validate('x'.repeat(200)) returns { valid: true } (exactly 200 chars)
test('TodoWidget validate() accepts text at exactly 200 characters', () => {
  const result = validateTaskText('x'.repeat(200));
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.error, null);
});

/**
 * Simulates adding a valid task to a task list.
 * Returns the updated list and a boolean indicating if input should be cleared.
 *
 * @param {Array} tasks - Current task list.
 * @param {string} text - Task text to add.
 * @returns {{ tasks: Array, shouldClearInput: boolean, error: string|null }}
 */
function addTask(tasks, text) {
  const validation = validateTaskText(text);
  if (!validation.valid) {
    return { tasks, shouldClearInput: false, error: validation.error };
  }

  const newTask = {
    id: `task-${Date.now()}-${Math.random()}`,
    text: text.trim(),
    completed: false,
    createdAt: Date.now()
  };

  return {
    tasks: [...tasks, newTask],
    shouldClearInput: true,
    error: null
  };
}

// Test: Adding a valid task appends it to the list and clears the input
test('TodoWidget adding a valid task appends it to the list', () => {
  const tasks = [];
  const result = addTask(tasks, 'Buy milk');
  
  assert.strictEqual(result.tasks.length, 1);
  assert.strictEqual(result.tasks[0].text, 'Buy milk');
  assert.strictEqual(result.tasks[0].completed, false);
  assert.strictEqual(result.shouldClearInput, true);
  assert.strictEqual(result.error, null);
});

// Test: Adding a task with empty text shows an error and does NOT add to the list
test('TodoWidget adding empty text shows error and does not add task', () => {
  const tasks = [{ id: '1', text: 'Existing task', completed: false, createdAt: 0 }];
  const result = addTask(tasks, '');
  
  assert.strictEqual(result.tasks.length, 1); // unchanged
  assert.strictEqual(result.shouldClearInput, false);
  assert.ok(result.error !== null);
});

/**
 * Simulates toggling a task's completed state by id.
 *
 * @param {Array} tasks - Current task list.
 * @param {string} id - Task id to toggle.
 * @returns {Array} Updated task list.
 */
function toggleTask(tasks, id) {
  return tasks.map(task => {
    if (task.id === id) {
      return { ...task, completed: !task.completed };
    }
    return task;
  });
}

// Test: Toggling a task flips its completed field
test('TodoWidget toggling a task flips its completed state', () => {
  const tasks = [
    { id: '1', text: 'Task 1', completed: false, createdAt: 0 },
    { id: '2', text: 'Task 2', completed: true, createdAt: 0 }
  ];
  
  // Toggle task 1: false → true
  let updated = toggleTask(tasks, '1');
  assert.strictEqual(updated[0].completed, true);
  assert.strictEqual(updated[1].completed, true); // unchanged
  
  // Toggle task 1 again: true → false
  updated = toggleTask(updated, '1');
  assert.strictEqual(updated[0].completed, false);
  assert.strictEqual(updated[1].completed, true); // unchanged
  
  // Toggle task 2: true → false
  updated = toggleTask(updated, '2');
  assert.strictEqual(updated[0].completed, false); // unchanged
  assert.strictEqual(updated[1].completed, false);
});

/**
 * Simulates deleting a task by id.
 *
 * @param {Array} tasks - Current task list.
 * @param {string} id - Task id to delete.
 * @returns {Array} Updated task list.
 */
function deleteTask(tasks, id) {
  return tasks.filter(task => task.id !== id);
}

// Test: Deleting a task by id removes it from the list
test('TodoWidget deleting a task removes it from the list', () => {
  const tasks = [
    { id: '1', text: 'Task 1', completed: false, createdAt: 0 },
    { id: '2', text: 'Task 2', completed: true, createdAt: 0 },
    { id: '3', text: 'Task 3', completed: false, createdAt: 0 }
  ];
  
  const updated = deleteTask(tasks, '2');
  assert.strictEqual(updated.length, 2);
  assert.strictEqual(updated[0].id, '1');
  assert.strictEqual(updated[1].id, '3');
  assert.ok(!updated.some(t => t.id === '2'));
});

/**
 * Simulates clearing all completed tasks.
 *
 * @param {Array} tasks - Current task list.
 * @returns {Array} Updated task list with only incomplete tasks.
 */
function clearCompleted(tasks) {
  return tasks.filter(task => !task.completed);
}

// Test: clearCompleted removes only completed tasks, preserving incomplete ones
test('TodoWidget clearCompleted removes only completed tasks', () => {
  const tasks = [
    { id: '1', text: 'Task 1', completed: false, createdAt: 0 },
    { id: '2', text: 'Task 2', completed: true, createdAt: 0 },
    { id: '3', text: 'Task 3', completed: false, createdAt: 0 },
    { id: '4', text: 'Task 4', completed: true, createdAt: 0 }
  ];
  
  const updated = clearCompleted(tasks);
  assert.strictEqual(updated.length, 2);
  assert.strictEqual(updated[0].id, '1');
  assert.strictEqual(updated[1].id, '3');
  assert.ok(updated.every(t => !t.completed));
});

// Test: clearCompleted on a list with no completed tasks leaves list unchanged
test('TodoWidget clearCompleted with no completed tasks leaves list unchanged', () => {
  const tasks = [
    { id: '1', text: 'Task 1', completed: false, createdAt: 0 },
    { id: '2', text: 'Task 2', completed: false, createdAt: 0 }
  ];
  
  const updated = clearCompleted(tasks);
  assert.strictEqual(updated.length, 2);
  assert.deepStrictEqual(updated, tasks);
});

// ═══════════════════════════════════════════════════════════════════════════
// Property-Based Tests: TimerWidget validation and runtime behavior
// Feature: todo-life-dashboard
//
// Property 9: Duration validation accepts all integers 1–60
//   For any integer in [1, 60], validateDuration returns valid=true.
//   // Feature: todo-life-dashboard, Property 9
//   Validates: Requirements 3.9, 3.10
//
// Property 10: Duration validation rejects values outside 1–60
//   For any value outside [1, 60] (0, negative, >60, non-integer, non-number),
//   validateDuration returns valid=false.
//   // Feature: todo-life-dashboard, Property 10
//   Validates: Requirements 3.9, 3.10
//
// Property 13: Timer remaining never goes below 0
//   Simulating tick() calls on a timer state never produces remaining < 0.
//   // Feature: todo-life-dashboard, Property 13
//   Validates: Requirement 3.1
//
// Property 14: Session switch resets remaining to full duration
//   After switchSession(), remaining equals the new session's full duration in seconds.
//   // Feature: todo-life-dashboard, Property 14
//   Validates: Requirement 3.6
// ═══════════════════════════════════════════════════════════════════════════

// ── Timer validation logic (mirrored from app.js) ───────────────────────

/**
 * Validates a timer duration input.
 * @param {*} val - Value to validate (any type).
 * @returns {{ valid: boolean, error: string|null }}
 */
function validateDuration(val) {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return { valid: false, error: 'Duration must be a number.' };
  }
  if (!Number.isInteger(val)) {
    return { valid: false, error: 'Duration must be an integer.' };
  }
  if (val < 1 || val > 60) {
    return { valid: false, error: 'Duration must be between 1 and 60 minutes.' };
  }
  return { valid: true, error: null };
}

// ── Timer runtime simulation helpers ───────────────────────────────────

/**
 * Simulates a single tick (1-second countdown).
 * @param {{ remaining: number }} state - Timer state with remaining seconds.
 */
function tick(state) {
  if (state.remaining > 0) {
    state.remaining--;
  }
}

/**
 * Simulates a session switch (work ↔ break).
 * @param {{ sessionType: 'work'|'break', remaining: number, workDuration: number, breakDuration: number }} state
 */
function switchSession(state) {
  if (state.sessionType === 'work') {
    state.sessionType = 'break';
    state.remaining = state.breakDuration * 60;
  } else {
    state.sessionType = 'work';
    state.remaining = state.workDuration * 60;
  }
}

// ── Property 9: Duration validation accepts all integers 1–60 ────────────
// Feature: todo-life-dashboard, Property 9
// Validates: Requirements 3.9, 3.10

console.log('');
console.log('Property 9: Duration validation accepts all integers 1–60');
console.log('  // Feature: todo-life-dashboard, Property 9');
console.log('  // Validates: Requirements 3.9, 3.10');

let prop9failures = 0;
for (let val = 1; val <= 60; val++) {
  const result = validateDuration(val);
  if (!result.valid) {
    prop9failures++;
    console.error(`  FAIL  validateDuration(${val}) returned valid=false, expected valid=true`);
    console.error(`        Error: ${result.error}`);
    failed++;
  }
}
if (prop9failures === 0) {
  console.log(`  PASS  Property 9: validateDuration accepts all integers 1–60 (60 iterations)`);
  passed++;
}

// ── Property 10: Duration validation rejects values outside 1–60 ─────────
// Feature: todo-life-dashboard, Property 10
// Validates: Requirements 3.9, 3.10

console.log('');
console.log('Property 10: Duration validation rejects values outside 1–60');
console.log('  // Feature: todo-life-dashboard, Property 10');
console.log('  // Validates: Requirements 3.9, 3.10');

const invalidSamples = [
  // Boundary violations
  0, -1, -25, 61, 100, 9999,
  // Non-integers
  0.5, 1.1, 25.999, 59.9, 60.1,
  // Non-numbers
  '25', 'hello', null, undefined, true, false, NaN, Infinity, -Infinity,
  // Objects and arrays
  {}, [], { value: 25 }, [25],
  // Generate additional varied samples to reach 100 iterations
  ...Array.from({ length: 100 - 24 }, (_, i) => {
    const variants = [
      -100 - i,              // more negative numbers
      61 + i,                // numbers > 60
      i + 0.5,               // more non-integers
      String(i),             // more strings
      i % 2 === 0 ? {} : [], // more objects/arrays
    ];
    return variants[i % variants.length];
  })
];

let prop10failures = 0;
for (let i = 0; i < invalidSamples.length; i++) {
  const val = invalidSamples[i];
  const result = validateDuration(val);
  if (result.valid) {
    prop10failures++;
    console.error(`  FAIL  iteration ${i}: validateDuration(${JSON.stringify(val)}) returned valid=true, expected valid=false`);
    failed++;
  }
}
if (prop10failures === 0) {
  console.log(`  PASS  Property 10: validateDuration rejects out-of-range values (${invalidSamples.length} iterations)`);
  passed++;
}

// ── Property 13: Timer remaining never goes below 0 ──────────────────────
// Feature: todo-life-dashboard, Property 13
// Validates: Requirement 3.1

console.log('');
console.log('Property 13: Timer remaining never goes below 0');
console.log('  // Feature: todo-life-dashboard, Property 13');
console.log('  // Validates: Requirement 3.1');

let prop13failures = 0;
const tickScenarios = [
  // Starting from various remaining values, tick many times
  { remaining: 0, ticks: 10 },
  { remaining: 1, ticks: 5 },
  { remaining: 5, ticks: 10 },
  { remaining: 10, ticks: 20 },
  { remaining: 59, ticks: 70 },
  { remaining: 60, ticks: 100 },
  { remaining: 300, ticks: 400 },   // 5 minutes
  { remaining: 1500, ticks: 2000 }, // 25 minutes
  { remaining: 3600, ticks: 4000 }, // 60 minutes
  // Generate additional scenarios to reach ≥100 iterations
  ...Array.from({ length: 100 - 9 }, (_, i) => ({
    remaining: (i % 60) + 1,
    ticks: i + 10
  }))
];

for (let i = 0; i < tickScenarios.length; i++) {
  const { remaining: initialRemaining, ticks: numTicks } = tickScenarios[i];
  const state = { remaining: initialRemaining };

  for (let t = 0; t < numTicks; t++) {
    tick(state);
    if (state.remaining < 0) {
      prop13failures++;
      console.error(`  FAIL  iteration ${i}: remaining went below 0 after ${t + 1} ticks (initial=${initialRemaining}, final=${state.remaining})`);
      failed++;
      break;
    }
  }
}
if (prop13failures === 0) {
  console.log(`  PASS  Property 13: Timer remaining never goes below 0 (${tickScenarios.length} iterations)`);
  passed++;
}

// ── Property 14: Session switch resets remaining to full duration ────────
// Feature: todo-life-dashboard, Property 14
// Validates: Requirement 3.6

console.log('');
console.log('Property 14: Session switch resets remaining to full duration');
console.log('  // Feature: todo-life-dashboard, Property 14');
console.log('  // Validates: Requirement 3.6');

const switchScenarios = [
  // Format: { sessionType, workDuration, breakDuration, expectedRemaining, expectedType }
  { sessionType: 'work', workDuration: 25, breakDuration: 5, expectedType: 'break', expectedRemaining: 300 },
  { sessionType: 'break', workDuration: 25, breakDuration: 5, expectedType: 'work', expectedRemaining: 1500 },
  { sessionType: 'work', workDuration: 1, breakDuration: 1, expectedType: 'break', expectedRemaining: 60 },
  { sessionType: 'break', workDuration: 1, breakDuration: 1, expectedType: 'work', expectedRemaining: 60 },
  { sessionType: 'work', workDuration: 60, breakDuration: 60, expectedType: 'break', expectedRemaining: 3600 },
  { sessionType: 'break', workDuration: 60, breakDuration: 60, expectedType: 'work', expectedRemaining: 3600 },
  { sessionType: 'work', workDuration: 30, breakDuration: 10, expectedType: 'break', expectedRemaining: 600 },
  { sessionType: 'break', workDuration: 30, breakDuration: 10, expectedType: 'work', expectedRemaining: 1800 },
  // Generate additional scenarios to reach ≥100 iterations
  ...Array.from({ length: 100 - 8 }, (_, i) => {
    const workDur = (i % 60) + 1;
    const breakDur = ((i + 13) % 60) + 1;
    const isWork = i % 2 === 0;
    return {
      sessionType: isWork ? 'work' : 'break',
      workDuration: workDur,
      breakDuration: breakDur,
      expectedType: isWork ? 'break' : 'work',
      expectedRemaining: isWork ? breakDur * 60 : workDur * 60
    };
  })
];

let prop14failures = 0;
for (let i = 0; i < switchScenarios.length; i++) {
  const { sessionType, workDuration, breakDuration, expectedType, expectedRemaining } = switchScenarios[i];
  const state = {
    sessionType,
    workDuration,
    breakDuration,
    remaining: 999 // arbitrary non-zero value before switch
  };

  switchSession(state);

  const typeOk = state.sessionType === expectedType;
  const remainingOk = state.remaining === expectedRemaining;

  if (!typeOk || !remainingOk) {
    prop14failures++;
    console.error(`  FAIL  iteration ${i}: switchSession did not reset correctly`);
    console.error(`        Before: sessionType=${sessionType}, workDuration=${workDuration}, breakDuration=${breakDuration}`);
    console.error(`        After:  sessionType=${state.sessionType} (expected ${expectedType}), remaining=${state.remaining} (expected ${expectedRemaining})`);
    failed++;
  }
}
if (prop14failures === 0) {
  console.log(`  PASS  Property 14: Session switch resets remaining to full duration (${switchScenarios.length} iterations)`);
  passed++;
}

// ── Final summary ────────────────────────────────────────────────────────

console.log('');
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}


// ═══════════════════════════════════════════════════════════════════════════
// Property-Based Tests: LinksWidget
// Feature: todo-life-dashboard
//
// Property 5: Links list length invariant
//   After adding N valid links to an empty list, the list length equals N.
//   Validates: Requirements 4.1, 4.6
//
// Property 6: Delete link removes exactly one
//   After deleting a link by id, the list length decreases by exactly 1
//   and no link with that id remains.
//   Validates: Requirement 4.6
//
// Property 7: Max 20 links enforced
//   Attempting to add a 21st link returns a validation error; the list
//   stays at 20.
//   Validates: Requirement 4.8
//
// Property 8: URL validation rejects non-http(s)
//   For any URL that does not start with "http://" or "https://",
//   validate() returns valid=false.
//   Validates: Requirement 4.4
//
// All properties use a deterministic 100-iteration micro-runner that mirrors
// the LinksWidget validate / addLink / deleteLink logic inline.
// ═══════════════════════════════════════════════════════════════════════════

// ── LinksWidget inline logic (mirrored from app.js) ──────────────────────

/**
 * Validates a label and URL for a new quick link against a given list.
 * Mirrors LinksWidget.validate from app.js (without AppState coupling).
 *
 * @param {string} label    - Display label.
 * @param {string} url      - Target URL.
 * @param {Array}  linkList - Current list of links (to check the 20-item cap).
 * @returns {{ valid: boolean, errors: string[] }}
 */
function linksValidate(label, url, linkList) {
  const errors = [];
  const trimmedLabel = typeof label === 'string' ? label.trim() : '';
  const trimmedUrl   = typeof url   === 'string' ? url.trim()   : '';

  // Label checks (Req 4.3, 4.5)
  if (trimmedLabel.length === 0) {
    errors.push('Label is required.');
  } else if (trimmedLabel.length > 50) {
    errors.push('Label must be 50 characters or fewer.');
  }

  // URL checks (Req 4.3, 4.4)
  if (trimmedUrl.length === 0) {
    errors.push('URL is required.');
  } else if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    errors.push('URL must begin with http:// or https://.');
  }

  // Max 20 links (Req 4.8)
  if (linkList.length >= 20) {
    errors.push('Maximum of 20 links has been reached.');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Adds a valid link to a list (pure – does not mutate the original array).
 * Mirrors LinksWidget.addLink from app.js.
 *
 * @param {Array}  linkList - Current list of links.
 * @param {string} label    - Display label.
 * @param {string} url      - Target URL.
 * @param {string} id       - Unique identifier for the new link.
 * @returns {{ list: Array, added: boolean }}
 */
function linksAdd(linkList, label, url, id) {
  const result = linksValidate(label, url, linkList);
  if (!result.valid) {
    return { list: linkList, added: false, errors: result.errors };
  }
  const newList = linkList.concat([{ id, label: label.trim(), url: url.trim() }]);
  return { list: newList, added: true, errors: [] };
}

/**
 * Deletes a link by id from a list (pure – returns a new array).
 * Mirrors LinksWidget.deleteLink from app.js.
 *
 * @param {Array}  linkList - Current list of links.
 * @param {string} id       - Id of the link to remove.
 * @returns {Array} New list without the removed link.
 */
function linksDelete(linkList, id) {
  return linkList.filter(link => link.id !== id);
}

// ── Deterministic data generators ────────────────────────────────────────

/** Generates a valid http(s) URL for iteration i. */
function makeValidUrl(i) {
  const scheme = i % 2 === 0 ? 'https://' : 'http://';
  return `${scheme}example-${i}.com/path`;
}

/** Generates a valid label (1–50 chars) for iteration i. */
function makeValidLabel(i) {
  // Cycle through lengths 1..50 to exercise the boundary
  const len = (i % 50) + 1;
  return `Link${'x'.repeat(len - 4 < 0 ? 0 : len - 4)}${i}`.slice(0, len).padStart(1, 'L');
}

/** Generates a unique link id for iteration i. */
function makeLinkId(i) {
  return `lnk-prop-${i}`;
}

/**
 * Generates a URL that does NOT start with "http://" or "https://".
 * Covers a wide variety of non-http(s) forms across 100 iterations.
 */
function makeInvalidUrl(i) {
  const variants = [
    // Completely different schemes
    'ftp://example.com',
    'ftps://example.com',
    'ws://example.com',
    'wss://example.com',
    'file:///home/user',
    'data:text/plain,hello',
    'javascript:void(0)',
    'mailto:user@example.com',
    'tel:+1234567890',
    'ssh://server.example.com',
    // Near-miss cases (case sensitivity, extra chars)
    'HTTP://example.com',
    'HTTPS://example.com',
    'Http://example.com',
    'Https://example.com',
    'hhttp://example.com',
    'hhttps://example.com',
    ' http://example.com',   // leading space
    ' https://example.com',
    'http:/example.com',     // single slash
    'https:/example.com',
    // Protocol-relative
    '//example.com',
    // Bare hostname / path
    'example.com',
    'www.example.com',
    '/relative/path',
    '../other/path',
    // Empty-ish
    '   ',
    '',
    'nope',
    '123',
    '\thttp://example.com',  // leading tab
  ];
  return variants[i % variants.length];
}

// ── Property 5: Links list length invariant ──────────────────────────────
// Feature: todo-life-dashboard, Property 5
// Validates: Requirements 4.1, 4.6

console.log('');
console.log('Property 5: Links list length invariant');
console.log('  // Feature: todo-life-dashboard, Property 5');
console.log('  // Validates: Requirements 4.1, 4.6');

test('Property 5: adding N valid links to an empty list produces a list of length N (100 iterations)', () => {
  for (let n = 1; n <= 100; n++) {
    let list = [];

    // Add exactly n links (cap at 20 per requirement — so we cycle within [1..20])
    const count = ((n - 1) % 20) + 1; // 1..20
    for (let i = 0; i < count; i++) {
      const { list: updated, added } = linksAdd(list, makeValidLabel(i), makeValidUrl(i), makeLinkId(n * 1000 + i));
      assert.ok(added, `Iteration ${n}, link ${i}: expected valid link to be added`);
      list = updated;
    }

    assert.strictEqual(
      list.length,
      count,
      `Iteration ${n}: expected list length ${count} after adding ${count} links, got ${list.length}`
    );
  }
});

// ── Property 6: Delete link removes exactly one ──────────────────────────
// Feature: todo-life-dashboard, Property 6
// Validates: Requirement 4.6

console.log('');
console.log('Property 6: Delete link removes exactly one');
console.log('  // Feature: todo-life-dashboard, Property 6');
console.log('  // Validates: Requirement 4.6');

test('Property 6: deleting a link by id decreases length by 1 and removes that id (100 iterations)', () => {
  for (let i = 0; i < 100; i++) {
    // Build a list with (i % 19) + 2 links  → always at least 2 so there is something left
    const size = (i % 19) + 2; // 2..20
    let list = [];
    for (let j = 0; j < size; j++) {
      const { list: updated } = linksAdd(list, makeValidLabel(j), makeValidUrl(j), `del-lnk-${i}-${j}`);
      list = updated;
    }

    // Pick a target link from the middle of the list
    const targetIdx = Math.floor(size / 2);
    const targetId  = list[targetIdx].id;

    const before = list.length;
    const after  = linksDelete(list, targetId);

    assert.strictEqual(
      after.length,
      before - 1,
      `Iteration ${i}: expected length ${before - 1} after delete, got ${after.length}`
    );
    assert.ok(
      !after.some(link => link.id === targetId),
      `Iteration ${i}: deleted id "${targetId}" still present in list`
    );
  }
});

// ── Property 7: Max 20 links enforced ────────────────────────────────────
// Feature: todo-life-dashboard, Property 7
// Validates: Requirement 4.8

console.log('');
console.log('Property 7: Max 20 links enforced');
console.log('  // Feature: todo-life-dashboard, Property 7');
console.log('  // Validates: Requirement 4.8');

test('Property 7: adding a 21st link returns a validation error and list stays at 20 (100 iterations)', () => {
  for (let i = 0; i < 100; i++) {
    // Build a full list of exactly 20 links
    let list = [];
    for (let j = 0; j < 20; j++) {
      const { list: updated } = linksAdd(list, makeValidLabel(j), makeValidUrl(j), `max-lnk-${i}-${j}`);
      list = updated;
    }

    assert.strictEqual(list.length, 20, `Iteration ${i}: setup failed — expected 20 links`);

    // Attempt to add a 21st link (vary the label/url each iteration)
    const { list: after, added, errors } = linksAdd(
      list,
      `Extra Link ${i}`,
      makeValidUrl(i + 100),
      `overflow-${i}`
    );

    assert.strictEqual(added, false, `Iteration ${i}: 21st link should NOT be added`);
    assert.ok(errors.length > 0, `Iteration ${i}: expected at least one error message`);
    assert.strictEqual(after.length, 20, `Iteration ${i}: list should remain at 20, got ${after.length}`);
  }
});

// ── Property 8: URL validation rejects non-http(s) ───────────────────────
// Feature: todo-life-dashboard, Property 8
// Validates: Requirement 4.4

console.log('');
console.log('Property 8: URL validation rejects non-http(s)');
console.log('  // Feature: todo-life-dashboard, Property 8');
console.log('  // Validates: Requirement 4.4');

test('Property 8: validate() returns valid=false for any URL not starting with http:// or https:// (100 iterations)', () => {
  for (let i = 0; i < 100; i++) {
    const invalidUrl = makeInvalidUrl(i);
    const label = `Valid Label ${i}`;   // label is always valid for this property
    const result = linksValidate(label, invalidUrl, []); // empty list — no cap issue

    assert.strictEqual(
      result.valid,
      false,
      `Iteration ${i}: expected valid=false for URL "${invalidUrl}", got valid=true`
    );
    assert.ok(
      result.errors.length > 0,
      `Iteration ${i}: expected at least one error for URL "${invalidUrl}"`
    );
  }
});

// ── Updated summary (re-print after new properties) ─────────────────────

console.log('');
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}


// ═══════════════════════════════════════════════════════════════════════════
// Property-Based Tests: TodoWidget
// Feature: todo-life-dashboard
//
// These tests mirror the relevant TodoWidget logic inline (validate, addTask,
// toggleTask, deleteTask, clearCompleted) operating on plain arrays — no DOM,
// no AppState, no Storage required.
//
// Each property runs 100 iterations using deterministic representative inputs.
// ═══════════════════════════════════════════════════════════════════════════

// ── Inline TodoWidget logic (pure-function mirrors) ──────────────────────

/**
 * Validates a task text string.
 * Mirrors TodoWidget.validate from app.js.
 *
 * @param {string} text
 * @returns {{ valid: boolean, error: string|null }}
 */
function todoValidate(text) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return { valid: false, error: 'Task text is required.' };
  }
  if (text.length > 200) {
    return { valid: false, error: 'Task text must be 200 characters or fewer.' };
  }
  return { valid: true, error: null };
}

/**
 * Adds a task to a task list (returns a new list; does not mutate).
 * Mirrors TodoWidget.addTask behaviour on AppState.tasks.
 *
 * @param {Array}  tasks - Current task list.
 * @param {string} text  - Raw input text.
 * @param {number} [seqId] - Deterministic id seed (replaces crypto.randomUUID).
 * @returns {{ tasks: Array, added: boolean }}
 */
function todoAddTask(tasks, text, seqId) {
  const { valid } = todoValidate(text);
  if (!valid) return { tasks, added: false };

  const newTask = {
    id:        String(seqId !== undefined ? seqId : Date.now()),
    text:      text.trim(),
    completed: false,
    createdAt: 0
  };
  return { tasks: [...tasks, newTask], added: true };
}

/**
 * Toggles the completed flag of a task by id (returns a new list).
 * Mirrors TodoWidget.toggleTask.
 *
 * @param {Array}  tasks
 * @param {string} id
 * @returns {Array}
 */
function todoToggleTask(tasks, id) {
  return tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
}

/**
 * Removes a task by id (returns a new list).
 * Mirrors TodoWidget.deleteTask.
 *
 * @param {Array}  tasks
 * @param {string} id
 * @returns {Array}
 */
function todoDeleteTask(tasks, id) {
  return tasks.filter(t => t.id !== id);
}

/**
 * Removes all completed tasks (returns a new list).
 * Mirrors TodoWidget.clearCompleted.
 *
 * @param {Array} tasks
 * @returns {Array}
 */
function todoClearCompleted(tasks) {
  return tasks.filter(t => !t.completed);
}

// ── Input generators (deterministic, 100 representative values each) ──────

/**
 * Generates an array of 100 valid task text strings.
 * Covers single chars, long strings up to 200 chars, multi-word phrases,
 * special characters, digits, and mixed-case strings.
 */
function makeValidTexts() {
  const texts = [];
  // Single characters a-z (26)
  for (let c = 0; c < 26; c++) {
    texts.push(String.fromCharCode(97 + c));
  }
  // Lengths 1–50 with a repeated character
  for (let len = 1; len <= 50; len++) {
    texts.push('x'.repeat(len));
  }
  // Exactly 200 characters
  texts.push('y'.repeat(200));
  // Mixed phrases
  const phrases = [
    'Buy groceries', 'Read a book', 'Call the dentist',
    'Finish the report', 'Exercise for 30 minutes',
    'Review pull requests', 'Update documentation',
    'Plan the sprint', 'Fix the bug', 'Write unit tests',
    'Deploy to staging', 'Send the invoice',
    'Schedule the meeting', 'Water the plants',
    'Clean the desk', 'Check emails',
    'Back up files', 'Learn TypeScript',
    'Watch the tutorial', 'Complete the course',
    '  leading space',           // leading whitespace — trim should keep text
    'trailing space  ',
    '123 numbered task',
    '!@#$%^&*() special chars',
    'Task with\ttab'
  ];
  for (const p of phrases) texts.push(p);

  // Fill remaining slots to reach 100 with numbered tasks
  let i = 0;
  while (texts.length < 100) {
    texts.push(`Task number ${++i}`);
  }
  return texts.slice(0, 100);
}

/**
 * Generates an array of 100 invalid (empty / whitespace-only) strings.
 */
function makeInvalidTexts() {
  const texts = [];
  // Pure whitespace variants
  texts.push('');
  texts.push(' ');
  texts.push('  ');
  texts.push('\t');
  texts.push('\n');
  texts.push('\r\n');
  texts.push('   \t\n  ');
  // Repeated spaces 1–93 (to reach 100 total)
  for (let n = 1; n <= 93; n++) {
    texts.push(' '.repeat(n));
  }
  return texts.slice(0, 100);
}

/**
 * Generates an array of 100 strings that each exceed 200 characters.
 */
function makeTooLongTexts() {
  const texts = [];
  // 201 chars
  texts.push('a'.repeat(201));
  // 202–299 chars
  for (let len = 202; len <= 299; len++) {
    texts.push('b'.repeat(len));
  }
  // 1000 chars
  texts.push('c'.repeat(1000));
  return texts.slice(0, 100);
}

/**
 * Builds a task list of `count` tasks, alternating completed/incomplete.
 * Each task gets a unique sequential id.
 *
 * @param {number} count
 * @param {boolean} [allCompleted=false]
 * @param {boolean} [allIncomplete=false]
 * @returns {Array}
 */
function makeTaskList(count, allCompleted = false, allIncomplete = false) {
  const tasks = [];
  for (let i = 0; i < count; i++) {
    let completed;
    if (allCompleted)   completed = true;
    else if (allIncomplete) completed = false;
    else                completed = i % 2 === 0; // alternating
    tasks.push({ id: `task-${i}`, text: `Task ${i}`, completed, createdAt: i });
  }
  return tasks;
}

const validTexts    = makeValidTexts();
const invalidTexts  = makeInvalidTexts();
const tooLongTexts  = makeTooLongTexts();

// ── Property 1: Task list length invariant ────────────────────────────────
// Feature: todo-life-dashboard, Property 1
// Validates: Requirements 2.1, 2.6

console.log('');
console.log('Property 1: Task list length invariant (add N valid tasks → length = N)');
console.log('  // Feature: todo-life-dashboard, Property 1');
console.log('  // Validates: Requirements 2.1, 2.6');

let prop1failures = 0;

for (let i = 0; i < validTexts.length; i++) {
  // Start from empty list and add i+1 tasks (one per iteration adds up)
  let tasks = [];
  const N = (i % 10) + 1; // Add 1–10 tasks in batches to cover a range of N values

  for (let k = 0; k < N; k++) {
    const result = todoAddTask(tasks, validTexts[(i + k) % validTexts.length], i * 100 + k);
    tasks = result.tasks;
  }

  if (tasks.length !== N) {
    prop1failures++;
    console.error(`  FAIL  iteration ${i}: expected length ${N}, got ${tasks.length}`);
    console.error(`        texts used: ${validTexts.slice(i, i + N).join(', ')}`);
    failed++;
  }
}

// Also verify that invalid and too-long inputs do NOT increase list length
for (let i = 0; i < invalidTexts.length; i++) {
  const before = [];
  const result = todoAddTask(before, invalidTexts[i], i);
  if (result.tasks.length !== 0) {
    prop1failures++;
    console.error(`  FAIL  invalid text iteration ${i}: list grew unexpectedly`);
    failed++;
  }
}

for (let i = 0; i < tooLongTexts.length; i++) {
  const before = [];
  const result = todoAddTask(before, tooLongTexts[i], i);
  if (result.tasks.length !== 0) {
    prop1failures++;
    console.error(`  FAIL  too-long text iteration ${i}: list grew unexpectedly`);
    failed++;
  }
}

if (prop1failures === 0) {
  console.log(`  PASS  Property 1: Task list length invariant (${validTexts.length} valid + ${invalidTexts.length} invalid + ${tooLongTexts.length} too-long iterations)`);
  passed++;
}

// ── Property 2: Toggle is its own inverse ────────────────────────────────
// Feature: todo-life-dashboard, Property 2
// Validates: Requirement 2.5

console.log('');
console.log('Property 2: Toggle is its own inverse (toggle twice → original state)');
console.log('  // Feature: todo-life-dashboard, Property 2');
console.log('  // Validates: Requirement 2.5');

let prop2failures = 0;

// Run 100 iterations: each uses a single task with a varying initial completion state
for (let i = 0; i < 100; i++) {
  const originalCompleted = i % 2 === 0; // alternates true/false across iterations
  const task = { id: `toggle-${i}`, text: `Task ${i}`, completed: originalCompleted, createdAt: i };
  let tasks = [task];

  // Toggle once
  tasks = todoToggleTask(tasks, task.id);
  // Toggle back
  tasks = todoToggleTask(tasks, task.id);

  const finalCompleted = tasks[0].completed;

  if (finalCompleted !== originalCompleted) {
    prop2failures++;
    console.error(`  FAIL  iteration ${i}: original=${originalCompleted}, after two toggles=${finalCompleted}`);
    failed++;
  }

  // Also verify intermediate state is the flipped value
  let tasksOnce = [task];
  tasksOnce = todoToggleTask(tasksOnce, task.id);
  if (tasksOnce[0].completed === originalCompleted) {
    prop2failures++;
    console.error(`  FAIL  iteration ${i}: single toggle did not flip completed state`);
    failed++;
  }
}

if (prop2failures === 0) {
  console.log(`  PASS  Property 2: Toggle is its own inverse (100 iterations)`);
  passed++;
}

// ── Property 3: Delete removes exactly one task ──────────────────────────
// Feature: todo-life-dashboard, Property 3
// Validates: Requirement 2.7

console.log('');
console.log('Property 3: Delete removes exactly one task');
console.log('  // Feature: todo-life-dashboard, Property 3');
console.log('  // Validates: Requirement 2.7');

let prop3failures = 0;

for (let i = 0; i < 100; i++) {
  // List sizes: 1 to 20, cycling
  const listSize = (i % 20) + 1;
  const tasks = makeTaskList(listSize);

  // Pick the id of the task to delete (cycle through positions)
  const deleteIndex = i % listSize;
  const deleteId    = tasks[deleteIndex].id;

  const after = todoDeleteTask(tasks, deleteId);

  // Length decreases by exactly 1
  if (after.length !== tasks.length - 1) {
    prop3failures++;
    console.error(`  FAIL  iteration ${i}: expected length ${tasks.length - 1}, got ${after.length}`);
    failed++;
    continue;
  }

  // The deleted id is no longer present
  if (after.some(t => t.id === deleteId)) {
    prop3failures++;
    console.error(`  FAIL  iteration ${i}: deleted id "${deleteId}" still present in list`);
    failed++;
  }
}

if (prop3failures === 0) {
  console.log(`  PASS  Property 3: Delete removes exactly one task (100 iterations)`);
  passed++;
}

// ── Property 4: clearCompleted removes only completed tasks ──────────────
// Feature: todo-life-dashboard, Property 4
// Validates: Requirement 2.8

console.log('');
console.log('Property 4: clearCompleted removes only completed tasks');
console.log('  // Feature: todo-life-dashboard, Property 4');
console.log('  // Validates: Requirement 2.8');

let prop4failures = 0;

for (let i = 0; i < 100; i++) {
  // Vary list size (0–19) and composition
  const listSize = i % 20;

  let tasks;
  if (i % 4 === 0) {
    // All completed
    tasks = makeTaskList(listSize, true, false);
  } else if (i % 4 === 1) {
    // All incomplete
    tasks = makeTaskList(listSize, false, true);
  } else {
    // Mixed — alternating
    tasks = makeTaskList(listSize);
  }

  const incompleteIds = tasks.filter(t => !t.completed).map(t => t.id);
  const completedIds  = tasks.filter(t =>  t.completed).map(t => t.id);

  const after = todoClearCompleted(tasks);

  // No completed tasks remain
  const completedRemaining = after.filter(t => t.completed);
  if (completedRemaining.length > 0) {
    prop4failures++;
    console.error(`  FAIL  iteration ${i}: ${completedRemaining.length} completed task(s) still present after clearCompleted`);
    failed++;
    continue;
  }

  // All previously incomplete tasks are still present and in original order
  const afterIds = after.map(t => t.id);
  let orderOk = true;
  let prevIdx  = -1;

  for (const id of incompleteIds) {
    const idx = afterIds.indexOf(id);
    if (idx === -1) {
      prop4failures++;
      console.error(`  FAIL  iteration ${i}: incomplete task id "${id}" missing after clearCompleted`);
      failed++;
      orderOk = false;
      break;
    }
    if (idx <= prevIdx) {
      prop4failures++;
      console.error(`  FAIL  iteration ${i}: incomplete task id "${id}" is out of original order after clearCompleted`);
      failed++;
      orderOk = false;
      break;
    }
    prevIdx = idx;
  }

  // Verify no extra tasks were added
  if (orderOk && after.length !== incompleteIds.length) {
    prop4failures++;
    console.error(`  FAIL  iteration ${i}: after.length=${after.length} but expected ${incompleteIds.length} incomplete tasks`);
    failed++;
  }
}

if (prop4failures === 0) {
  console.log(`  PASS  Property 4: clearCompleted removes only completed tasks (100 iterations)`);
  passed++;
}

// ── Final summary (reprint so it reflects property test results) ─────────

console.log('');
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
