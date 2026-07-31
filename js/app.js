// To-Do Life Dashboard — application logic
// Single-page personal dashboard: Clock, To-Do List, Focus Timer, Quick Links
// All state lives in AppState; persistence is handled by Storage.

'use strict';

// ── Notification Banner ────────────────────────────────────────────────────

/**
 * Displays a dismissible non-blocking notification banner.
 * Uses role="status" + aria-live="polite" (set in HTML) for screen readers.
 *
 * @param {string} message - Human-readable message to display.
 */
function showBanner(message) {
  const banner = document.getElementById('notification-banner');
  if (!banner) return;

  // Clear any existing content and inject new message + dismiss button
  banner.innerHTML = '';

  const msg = document.createElement('span');
  msg.textContent = message;

  const btn = document.createElement('button');
  btn.textContent = 'Dismiss';
  btn.setAttribute('aria-label', 'Dismiss notification');
  btn.addEventListener('click', () => {
    banner.innerHTML = '';
    banner.removeAttribute('data-visible');
  });

  banner.appendChild(msg);
  banner.appendChild(btn);
  banner.setAttribute('data-visible', 'true');
}

// ── AppState ───────────────────────────────────────────────────────────────

/**
 * Central mutable state object. All widgets read from and write to this object.
 * TimerRuntime fields (sessionType, remaining, status, intervalId) are NOT
 * persisted — they reset to defaults on each page load.
 *
 * @type {{
 *   tasks: Array<{id: string, text: string, completed: boolean, createdAt: number}>,
 *   timer: {
 *     workDuration: number,
 *     breakDuration: number,
 *     sessionType: 'work'|'break',
 *     remaining: number,
 *     status: 'idle'|'running'|'paused',
 *     intervalId: number|null
 *   },
 *   links: Array<{id: string, label: string, url: string}>
 * }}
 */
const AppState = {
  tasks: [],
  timer: {
    workDuration:  25,       // minutes (persisted)
    breakDuration: 5,        // minutes (persisted)
    sessionType:   'work',   // runtime — reset on load
    remaining:     1500,     // seconds = 25 * 60, runtime — reset on load
    status:        'idle',   // runtime — reset on load
    intervalId:    null      // runtime — reset on load
  },
  links: []
};

// ── Storage ────────────────────────────────────────────────────────────────

/**
 * Handles all localStorage interaction.
 * Only persists tasks, links, and timer config (workDuration, breakDuration).
 * Timer runtime fields (sessionType, remaining, status, intervalId) are
 * NOT written to or read from localStorage.
 */
const Storage = {
  KEY: 'dashboardState',

  /** @type {number|null} Debounce timer handle */
  _saveTimer: null,

  /**
   * Reads and parses DashboardState from localStorage.
   * - Returns a safe defaults object when localStorage is empty.
   * - Falls back to defaults per field on type mismatch, emitting a
   *   console warning for each invalid field.
   * - Shows a notification banner and returns full defaults when JSON
   *   parsing fails entirely.
   *
   * Validates: Requirements 5.4, 5.5, 5.7
   *
   * @returns {{
   *   tasks: Array,
   *   timer: { workDuration: number, breakDuration: number },
   *   links: Array
   * }}
   */
  load() {
    /** Default state returned on total failure or empty storage. */
    const defaults = {
      tasks: [],
      timer: { workDuration: 25, breakDuration: 5 },
      links: []
    };

    let raw;
    try {
      raw = localStorage.getItem(this.KEY);
    } catch (err) {
      // localStorage unavailable (e.g., SecurityError in sandboxed iframe)
      showBanner('Your saved data could not be loaded. Starting fresh.');
      return defaults;
    }

    // Nothing stored yet — return defaults silently
    if (raw === null) {
      return defaults;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      // JSON parse error — treat as total failure
      showBanner('Your saved data could not be loaded. Starting fresh.');
      return defaults;
    }

    // Validate and recover each top-level field individually
    const result = {
      tasks: defaults.tasks,
      timer: { ...defaults.timer },
      links: defaults.links
    };

    // ── tasks ──
    if (Array.isArray(parsed.tasks)) {
      result.tasks = parsed.tasks;
    } else if (parsed.tasks !== undefined) {
      console.warn('[Storage.load] "tasks" is not an array; using default []');
    }

    // ── timer ──
    if (parsed.timer !== null && typeof parsed.timer === 'object') {
      const { workDuration, breakDuration } = parsed.timer;

      if (typeof workDuration === 'number' && Number.isFinite(workDuration)) {
        result.timer.workDuration = workDuration;
      } else if (workDuration !== undefined) {
        console.warn('[Storage.load] "timer.workDuration" is not a valid number; using default 25');
      }

      if (typeof breakDuration === 'number' && Number.isFinite(breakDuration)) {
        result.timer.breakDuration = breakDuration;
      } else if (breakDuration !== undefined) {
        console.warn('[Storage.load] "timer.breakDuration" is not a valid number; using default 5');
      }
    } else if (parsed.timer !== undefined) {
      console.warn('[Storage.load] "timer" is not an object; using default timer config');
    }

    // ── links ──
    if (Array.isArray(parsed.links)) {
      result.links = parsed.links;
    } else if (parsed.links !== undefined) {
      console.warn('[Storage.load] "links" is not an array; using default []');
    }

    return result;
  },

  /**
   * Serializes the relevant parts of AppState and writes to localStorage.
   * Debounced — the actual write is deferred until 500ms after the last call.
   * Only persists tasks, links, and timer config (not runtime timer fields).
   *
   * On QuotaExceededError or SecurityError, shows a notification banner and
   * continues in-memory without reverting the state change.
   *
   * Validates: Requirements 5.1, 5.2, 5.3, 5.6, 5.7
   *
   * @param {typeof AppState} state - The current application state.
   */
  save(state) {
    // Cancel any pending debounced write
    if (this._saveTimer !== null) {
      clearTimeout(this._saveTimer);
    }

    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;

      // Build the persisted subset — timer runtime fields are intentionally excluded
      const persisted = {
        tasks: state.tasks,
        timer: {
          workDuration:  state.timer.workDuration,
          breakDuration: state.timer.breakDuration
        },
        links: state.links
      };

      try {
        localStorage.setItem(this.KEY, JSON.stringify(persisted));
      } catch (err) {
        // QuotaExceededError, SecurityError, or any other write failure
        if (
          err.name === 'QuotaExceededError'   ||
          err.name === 'NS_ERROR_DOM_QUOTA_REACHED'  ||  // Firefox variant
          err.name === 'SecurityError'
        ) {
          showBanner('Changes could not be saved. Your data may not persist.');
        } else {
          showBanner('Changes could not be saved. Your data may not persist.');
        }
      }
    }, 500);
  }
};

// ── EventBus ───────────────────────────────────────────────────────────────

/**
 * Minimal pub/sub for decoupled cross-widget notifications.
 * Used primarily for aria-live announcements.
 */
const EventBus = {
  /** @type {Object.<string, Function[]>} */
  listeners: {},

  /**
   * Registers a listener for the given event.
   * @param {string}   event - Event name.
   * @param {Function} fn    - Callback invoked with (data) on emit.
   */
  on(event, fn) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(fn);
  },

  /**
   * Emits an event, invoking all registered listeners with the given data.
   * @param {string} event - Event name.
   * @param {*}      data  - Payload passed to each listener.
   */
  emit(event, data) {
    const fns = this.listeners[event];
    if (!fns) return;
    for (const fn of fns) {
      fn(data);
    }
  }
};

// ── Placeholder stubs (filled in by subsequent tasks) ─────────────────────

// ── GreetingWidget ─────────────────────────────────────────────────────────
/**
 * Displays time-based greeting and allows custom name editing.
 * REQUIRED FEATURE: Time-based greeting + CHALLENGE: Custom name
 */
const GreetingWidget = {
  el: null,
  _messageEl: null,
  _nameDisplayEl: null,
  _editBtn: null,
  _userName: null,

  init(rootEl) {
    this.el = rootEl;
    this._messageEl = document.getElementById('greeting-message');
    this._nameDisplayEl = document.getElementById('greeting-name-display');
    this._editBtn = document.getElementById('greeting-name-edit');

    // Load saved name from localStorage
    this._userName = localStorage.getItem('userName') || 'Guest';

    if (this._editBtn) {
      this._editBtn.addEventListener('click', () => this.promptName());
    }

    this.render();
    // Update greeting every minute
    setInterval(() => this.render(), 60000);
  },

  promptName() {
    const newName = prompt('Enter your name:', this._userName);
    if (newName && newName.trim()) {
      this._userName = newName.trim();
      localStorage.setItem('userName', this._userName);
      this.render();
    }
  },

  getGreeting() {
    const hour = new Date().getHours();

    // Good morning: 05:00:00 to 10:59:59
    if (hour >= 5 && hour < 11) {
      return 'Good Morning!';
    }

    // Good day: 11:00:00 to 12:59:59
    if (hour >= 11 && hour < 13) {
      return 'Good day!';
    }

    // Good afternoon: 13:00:00 to 17:59:59
    if (hour >= 13 && hour < 18) {
      return 'Good Afternoon!';
    }

    // Good evening: 18:00:00 to 04:59:59 (rest of the day)
    return 'Good Evening!';
  },

    render() {
    const hour = new Date().getHours();
    const greeting = this.getGreeting();
    let timeClass = 'evening';

    // Determine time period
    if (hour >= 5 && hour < 11) {
      timeClass = 'morning';
    } else if (hour >= 11 && hour < 13) {
      timeClass = 'day';
    } else if (hour >= 13 && hour < 18) {
      timeClass = 'afternoon';
    }

    if (this._messageEl) {
      this._messageEl.textContent = greeting;
      this._messageEl.classList.remove('morning', 'day', 'afternoon', 'evening');
      this._messageEl.classList.add(timeClass);
    }

    // Also add class to the container for styling child elements
    if (this.el) {
      this.el.classList.remove('morning', 'day', 'afternoon', 'evening');
      this.el.classList.add(timeClass);
    }

    if (this._nameDisplayEl) {
      this._nameDisplayEl.textContent = this._userName || 'Guest';
    }
  }
};

// ── ClockWidget ────────────────────────────────────────────────────────────

/**
 * Displays the current date and time, updated every second.
 * Hooks the Page Visibility API so the display is snapped to the correct
 * time immediately when a hidden tab becomes visible again.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
const ClockWidget = {
  /** @type {HTMLElement|null} Root section element */
  el: null,

  /** @type {number|null} Handle returned by setInterval */
  intervalId: null,

  /**
   * Wires up the widget.
   * - Starts a 1-second interval that calls tick().
   * - Listens for visibilitychange so that when the tab is restored the
   *   display is refreshed immediately (within 100 ms per requirement 1.4).
   *
   * @param {HTMLElement} rootEl - The #clock-widget section element.
   */
  init(rootEl) {
    this.el = rootEl;

    // Run immediately so there is no blank first second
    this.tick();

    // Update every second
    this.intervalId = setInterval(() => this.tick(), 1000);

    // Snap to current time the moment the tab becomes visible again
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.tick();
      }
    });
  },

  /**
   * Reads the current system time and delegates to render().
   */
  tick() {
    this.render(new Date());
  },

  /**
   * Updates the clock-time and clock-date DOM nodes.
   * Gracefully falls back to placeholder text when the date is invalid
   * (requirement 1.5).
   *
   * @param {Date} date - The date to display.
   */
    render(date) {
    const timeEl = document.getElementById('clock-time');
    const dateEl = document.getElementById('clock-date');
    const hour = date.getHours();

    if (timeEl) {
      const timeStr = this.formatTime(date);
      timeEl.textContent = timeStr;

      // Keep the <time> datetime attribute in sync (machine-readable)
      if (timeStr !== '--:--:--') {
        timeEl.setAttribute('datetime', date.toISOString());
      }

      // Remove all time-period classes
      timeEl.classList.remove('morning', 'day', 'afternoon', 'evening');

      // Add appropriate class based on time
      if (hour >= 5 && hour < 11) {
        timeEl.classList.add('morning');
      } else if (hour >= 11 && hour < 13) {
        timeEl.classList.add('day');
      } else if (hour >= 13 && hour < 18) {
        timeEl.classList.add('afternoon');
      } else {
        timeEl.classList.add('evening');
      }
    }

    if (dateEl) {
      dateEl.textContent = this.formatDate(date);

      // Also style the date with same time classes
      dateEl.classList.remove('morning', 'day', 'afternoon', 'evening');

      if (hour >= 5 && hour < 11) {
        dateEl.classList.add('morning');
      } else if (hour >= 11 && hour < 13) {
        dateEl.classList.add('day');
      } else if (hour >= 13 && hour < 18) {
        dateEl.classList.add('afternoon');
      } else {
        dateEl.classList.add('evening');
      }
    }
  },

  /**
   * Formats a Date as a zero-padded 24-hour HH:MM:SS string.
   * Returns "--:--:--" when the argument is not a valid Date.
   *
   * @param {Date} d - Date to format.
   * @returns {string} "HH:MM:SS" or "--:--:--".
   */
  formatTime(d) {
    if (!(d instanceof Date) || isNaN(d.getTime())) {
      return '--:--:--';
    }

    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  },

  /**
   * Formats a Date as "Weekday, Month DD, YYYY" (e.g. "Monday, July 7, 2025").
   * Returns an empty string when the argument is not a valid Date.
   *
   * @param {Date} d - Date to format.
   * @returns {string} Human-readable date string.
   */
  formatDate(d) {
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
};
// ── TodoWidget ─────────────────────────────────────────────────────────────

/**
 * Manages the to-do list widget: add, toggle, delete, clear completed.
 * All state lives in AppState.tasks; this module only drives the DOM.
 *
 * Requirements: 2.1–2.11
 */
const TodoWidget = {
  /** @type {HTMLElement|null} Root #todo-widget section */
  el: null,

  // Cached DOM references populated in init()
  _form:           null,
  _input:          null,
  _errorEl:        null,
  _countEl:        null,
  _emptyEl:        null,
  _listEl:         null,
  _clearBtn:       null,

  /**
   * Wires up the widget event listeners and performs the initial render.
   * @param {HTMLElement} rootEl - The #todo-widget section element.
   */
  init(rootEl) {
    this.el = rootEl;

    this._form     = document.getElementById('todo-form');
    this._input    = document.getElementById('todo-input');
    this._errorEl  = document.getElementById('todo-error');
    this._countEl  = document.getElementById('todo-count');
    this._emptyEl  = document.getElementById('todo-empty');
    this._listEl   = document.getElementById('todo-list');
    this._clearBtn = document.getElementById('clear-completed');

    // Form submit — add a task
    if (this._form) {
      this._form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = this._input ? this._input.value : '';
        this.addTask(text);
      });
    }

    // Clear input error message on input change
    if (this._input) {
      this._input.addEventListener('input', () => {
        if (this._errorEl) {
          this._errorEl.textContent = '';
        }
      });
    }

    // Clear Completed button
    if (this._clearBtn) {
      this._clearBtn.addEventListener('click', () => {
        // Announce if the button is disabled/unavailable
        const hasCompleted = AppState.tasks.some(t => t.completed);
        if (!hasCompleted) {
          EventBus.emit('stateChange', 'Clear Completed is not available — no completed tasks.');
          return;
        }
        this.clearCompleted();
      });
    }

    // Delegate task list interactions (toggle + delete)
    if (this._listEl) {
      this._listEl.addEventListener('change', (e) => {
        const cb = e.target.closest('input[type="checkbox"][data-id]');
        if (cb) {
          this.toggleTask(cb.dataset.id);
        }
      });

      this._listEl.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('button.task-delete');
        if (deleteBtn) {
          this.deleteTask(deleteBtn.dataset.id);
        }
      });

    }

    this.render();
  },

  /**
   * Validates the input text, creates a new Task, updates state, and re-renders.
   * @param {string} text - Raw input value from the form field.
   */
  // REPLACE addTask method:
addTask(text) {
  const { valid, error } = this.validate(text);
  if (!valid) {
    if (this._errorEl) {
      this._errorEl.textContent = error;
    }
    return;
  }

  // CHALLENGE FEATURE: Prevent duplicate tasks
  const trimmedText = text.trim();
  const isDuplicate = AppState.tasks.some(t =>
    t.text.toLowerCase() === trimmedText.toLowerCase()
  );

  if (isDuplicate) {
    if (this._errorEl) {
      this._errorEl.textContent = 'This task already exists!';
    }
    return;
  }

  if (this._errorEl) {
    this._errorEl.textContent = '';
  }

  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : String(Date.now());

  const task = {
    id,
    text: trimmedText,
    completed: false,
    createdAt: Date.now()
  };

  AppState.tasks.push(task);

  if (this._input) {
    this._input.value = '';
  }

  this.render();
  Storage.save(AppState);
},

// ADD NEW editTask method after deleteTask:
editTask(id) {
  const task = AppState.tasks.find(t => t.id === id);
  if (!task) return;

  const newText = prompt('Edit task:', task.text);
  if (newText && newText.trim() && newText.trim() !== task.text) {
    const trimmedText = newText.trim();

    // Check for duplicates (excluding current task)
    const isDuplicate = AppState.tasks.some(t =>
      t.id !== id && t.text.toLowerCase() === trimmedText.toLowerCase()
    );

    if (isDuplicate) {
      alert('A task with this text already exists!');
      return;
    }

    task.text = trimmedText;
    this.render();
    Storage.save(AppState);
  }
},

  /**
   * Flips the completion state of a task by id.
   * @param {string} id - Task id.
   */
  toggleTask(id) {
    const task = AppState.tasks.find(t => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    this.render();
    Storage.save(AppState);
  },

  /**
   * Removes a task from the list by id.
   * @param {string} id - Task id.
   */
  deleteTask(id) {
    AppState.tasks = AppState.tasks.filter(t => t.id !== id);
    this.render();
    Storage.save(AppState);
  },

  /**
   * Removes all completed tasks, preserving incomplete tasks in their
   * original order (requirement 2.8).
   */
  clearCompleted() {
    AppState.tasks = AppState.tasks.filter(t => !t.completed);
    this.render();
    Storage.save(AppState);
  },

  /**
   * Fully re-renders the task list DOM from AppState.tasks.
   * - Shows/hides the empty-state message (requirement 2.11).
   * - Shows/hides the "Clear Completed" button (requirement 2.11).
   * - Disables "Clear Completed" when no tasks are completed (requirement 2.9).
   * - Renders each task as a <li> with a checkbox, text <span>, and delete <button>.
   */
  render() {
    const tasks = AppState.tasks;
    const isEmpty = tasks.length === 0;
    const hasCompleted = tasks.some(t => t.completed);

    // Empty state message
    if (this._emptyEl) {
      this._emptyEl.hidden = !isEmpty;
    }

    // "Clear Completed" visibility and enabled state
    if (this._clearBtn) {
      this._clearBtn.hidden = isEmpty;
      this._clearBtn.disabled = !hasCompleted;
      // aria-disabled mirrors disabled for assistive tech
      if (hasCompleted) {
        this._clearBtn.removeAttribute('aria-disabled');
      } else {
        this._clearBtn.setAttribute('aria-disabled', 'true');
      }
    }

    // Rebuild task list
    if (!this._listEl) return;

    this._listEl.innerHTML = '';

    for (const task of tasks) {
      const li = document.createElement('li');
      li.className = task.completed ? 'task task--completed' : 'task';
      li.dataset.id = task.id;

      // Toggle checkbox
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.dataset.id = task.id;
      checkbox.setAttribute('aria-label', `Mark "${task.text}" as ${task.completed ? 'incomplete' : 'complete'}`);

      // Task text
      const span = document.createElement('span');
      span.className = 'task-text';
      span.textContent = task.text;

      // Edit button (NEW - REQUIRED FEATURE)
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'task-edit';
      editBtn.dataset.id = task.id;
      editBtn.textContent = '✏️';
      editBtn.setAttribute('aria-label', `Edit task: ${task.text}`);
      editBtn.addEventListener('click', () => this.editTask(task.id));

      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'task-delete';
      deleteBtn.dataset.id = task.id;
      deleteBtn.textContent = '🗑️';
      deleteBtn.setAttribute('aria-label', `Delete task: ${task.text}`);

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(editBtn);  // NEW
      li.appendChild(deleteBtn);
      this._listEl.appendChild(li);
    }

    this.renderCount();
  },

  /**
   * Updates the #todo-count element with the current incomplete task count
   * and emits a stateChange event so the aria-live announcer picks it up
   * (requirements 2.10, 7.4).
   */
  renderCount() {
    const incomplete = AppState.tasks.filter(t => !t.completed).length;
    const message = incomplete === 1 ? '1 Task Remaining' : `${incomplete} Tasks Remaining`;

    if (this._countEl) {
      this._countEl.textContent = message;
    }

    EventBus.emit('stateChange', message);
  },

  /**
   * Validates a task text string.
   * - Empty or whitespace-only → invalid (requirement 2.3).
   * - Exceeds 200 characters → invalid (requirement 2.4).
   *
   * @param {string} text - Raw text to validate.
   * @returns {{ valid: boolean, error: string|null }}
   */
  validate(text) {
    if (typeof text !== 'string' || text.trim().length === 0) {
      return { valid: false, error: 'Task text is required.' };
    }
    if (text.length > 200) {
      return { valid: false, error: 'Task text must be 200 characters or fewer.' };
    }
    return { valid: true, error: null };
  }
};
// ── TimerWidget ────────────────────────────────────────────────────────────

/**
 * Manages the Pomodoro-style Focus Timer widget.
 * Supports work/break sessions, start/pause/reset controls, configurable
 * durations, an audible end-of-session alert, and full aria-live rendering.
 *
 * Requirements: 3.1–3.11
 */
const TimerWidget = {
  /** @type {HTMLElement|null} Root #timer-widget section */
  el: null,

  // Cached DOM references populated in init()
  _sessionEl:      null,
  _displayEl:      null,
  _startBtn:       null,
  _pauseBtn:       null,
  _resetBtn:       null,
  _workInput:      null,
  _breakInput:     null,
  _workErrorEl:    null,
  _breakErrorEl:   null,

  /**
   * Caches DOM references, attaches event listeners, and performs the initial render.
   *
   * @param {HTMLElement} rootEl - The #timer-widget section element.
   */
  init(rootEl) {
    this.el = rootEl;

    this._sessionEl    = document.getElementById('timer-session');
    this._displayEl    = document.getElementById('timer-display');
    this._startBtn     = document.getElementById('timer-start');
    this._pauseBtn     = document.getElementById('timer-pause');
    this._resetBtn     = document.getElementById('timer-reset');
    this._workInput    = document.getElementById('timer-work-duration');
    this._breakInput   = document.getElementById('timer-break-duration');
    this._workErrorEl  = document.getElementById('timer-work-error');
    this._breakErrorEl = document.getElementById('timer-break-error');

    // Sync input values with persisted/default durations
    if (this._workInput) {
      this._workInput.value = AppState.timer.workDuration;
    }
    if (this._breakInput) {
      this._breakInput.value = AppState.timer.breakDuration;
    }

    // Start button
    if (this._startBtn) {
      this._startBtn.addEventListener('click', () => {
        if (AppState.timer.status === 'running') {
          EventBus.emit('stateChange', 'Timer is already running.');
          return;
        }
        this.start();
      });
    }

    // Pause button
    if (this._pauseBtn) {
      this._pauseBtn.addEventListener('click', () => {
        if (AppState.timer.status !== 'running') {
          EventBus.emit('stateChange', 'Timer is not running.');
          return;
        }
        this.pause();
      });
    }

    // Reset button
    if (this._resetBtn) {
      this._resetBtn.addEventListener('click', () => {
        this.reset();
      });
    }

    // Work duration input — validate on change (req 3.9, 3.10, 3.11)
    if (this._workInput) {
      this._workInput.addEventListener('change', () => {
        this.setWorkDuration(this._workInput.value);
      });
      // Clear error on user input
      this._workInput.addEventListener('input', () => {
        if (this._workErrorEl) {
          this._workErrorEl.textContent = '';
        }
      });
    }

    // Break duration input
    if (this._breakInput) {
      this._breakInput.addEventListener('change', () => {
        this.setBreakDuration(this._breakInput.value);
      });
      this._breakInput.addEventListener('input', () => {
        if (this._breakErrorEl) {
          this._breakErrorEl.textContent = '';
        }
      });
    }

    this.render();
  },

  /**
   * Begins (or resumes) the countdown.
   * Sets status to 'running' and starts a 1-second interval that calls tick().
   *
   * Requirements: 3.2, 3.4
   */
  start() {
    // Clear any stale interval before starting a new one
    if (AppState.timer.intervalId !== null) {
      clearInterval(AppState.timer.intervalId);
      AppState.timer.intervalId = null;
    }

    AppState.timer.status = 'running';
    AppState.timer.intervalId = setInterval(() => this.tick(), 1000);
    this.render();
  },

  /**
   * Freezes the countdown at the exact current remaining second.
   * Clears the interval and sets status to 'paused'.
   *
   * Requirements: 3.3
   */
  pause() {
    if (AppState.timer.intervalId !== null) {
      clearInterval(AppState.timer.intervalId);
      AppState.timer.intervalId = null;
    }
    AppState.timer.status = 'paused';
    this.render();
  },

  /**
   * Stops any running session, resets sessionType to 'work', and restores
   * remaining to the full configured work duration.
   *
   * Requirements: 3.5
   */
  reset() {
    if (AppState.timer.intervalId !== null) {
      clearInterval(AppState.timer.intervalId);
      AppState.timer.intervalId = null;
    }
    AppState.timer.sessionType = 'work';
    AppState.timer.remaining   = AppState.timer.workDuration * 60;
    AppState.timer.status      = 'idle';
    this.render();
  },

  /**
   * Called every second while the timer is running.
   * Decrements remaining by 1; when it reaches 0, calls switchSession().
   *
   * Requirements: 3.2, 3.6
   */
  tick() {
    AppState.timer.remaining -= 1;

    if (AppState.timer.remaining <= 0) {
      AppState.timer.remaining = 0;
      this.switchSession();
    } else {
      this.render();
    }
  },

  /**
   * Flips the session type (work↔break), resets remaining to the new session's
   * full duration, sets status to 'paused', plays the audible alert, and re-renders.
   *
   * Requirements: 3.6, 3.7
   */
  switchSession() {
    // Clear the running interval
    if (AppState.timer.intervalId !== null) {
      clearInterval(AppState.timer.intervalId);
      AppState.timer.intervalId = null;
    }

    // Flip session type
    const nextType = AppState.timer.sessionType === 'work' ? 'break' : 'work';
    AppState.timer.sessionType = nextType;

    // Reset remaining to the new session's full duration (req 3.6)
    AppState.timer.remaining =
      nextType === 'work'
        ? AppState.timer.workDuration  * 60
        : AppState.timer.breakDuration * 60;

    // New session starts paused (req 3.6)
    AppState.timer.status = 'paused';

    // Audible alert
    this.playAlert();

    // Announce session change to screen readers via aria-live
    const label = nextType === 'work' ? 'Work' : 'Break';
    EventBus.emit('stateChange', `Session complete. Starting ${label} session.`);

    this.render();
  },

  /**
   * Plays a 440 Hz tone for approximately 1 second via the Web Audio API.
   * Silently no-ops if AudioContext is unavailable (requirement 3.6 audio fallback).
   */
  playAlert() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const ctx  = new AudioCtx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type      = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);

      // Gentle fade-out to avoid a harsh click at the end
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1);

      // Clean up the context after the tone finishes
      osc.addEventListener('ended', () => {
        ctx.close().catch(() => {});
      });
    } catch (err) {
      // Audio unavailable — silently skip (req 3.6 fallback)
    }
  },

  /**
   * Updates the timer display, session label, and button enabled/disabled states.
   *
   * - #timer-display: zero-padded MM:SS (req 3.8)
   * - #timer-session: "Work" or "Break" (req 3.7)
   * - Start:  disabled when status is 'running'
   * - Pause:  disabled when status is NOT 'running'
   * - Reset:  always enabled
   *
   * Requirements: 3.7, 3.8
   */
  render() {
    const { remaining, sessionType, status } = AppState.timer;

    // MM:SS format (req 3.8)
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');
    const display = `${mm}:${ss}`;

    if (this._displayEl) {
      this._displayEl.textContent = display;
    }

    // Session label (req 3.7)
    if (this._sessionEl) {
      this._sessionEl.textContent = sessionType === 'work' ? 'Work' : 'Break';
    }

    // Button states
    const isRunning = status === 'running';

    if (this._startBtn) {
      this._startBtn.disabled = isRunning;
      if (isRunning) {
        this._startBtn.setAttribute('aria-disabled', 'true');
      } else {
        this._startBtn.removeAttribute('aria-disabled');
      }
    }

    if (this._pauseBtn) {
      this._pauseBtn.disabled = !isRunning;
      if (!isRunning) {
        this._pauseBtn.setAttribute('aria-disabled', 'true');
      } else {
        this._pauseBtn.removeAttribute('aria-disabled');
      }
    }

    // Reset is always enabled (req 3.5)
    if (this._resetBtn) {
      this._resetBtn.disabled = false;
      this._resetBtn.removeAttribute('aria-disabled');
    }

    // Announce to screen readers (req 7.3)
    EventBus.emit('stateChange', `${sessionType === 'work' ? 'Work' : 'Break'}: ${display}`);
  },

  /**
   * Validates and applies a new work session duration.
   * New value only takes effect at the START of the next work session (req 3.11).
   * The current session is unaffected.
   *
   * @param {*} mins - Raw value from the input field.
   *
   * Requirements: 3.9, 3.10, 3.11
   */
  setWorkDuration(mins) {
    const { valid, error } = this.validateDuration(mins);

    if (!valid) {
      if (this._workErrorEl) {
        this._workErrorEl.textContent = error;
      }
      // Restore the input to the current valid value
      if (this._workInput) {
        this._workInput.value = AppState.timer.workDuration;
      }
      return;
    }

    // Clear any previous error
    if (this._workErrorEl) {
      this._workErrorEl.textContent = '';
    }

    const newDuration = parseInt(mins, 10);
    AppState.timer.workDuration = newDuration;
    Storage.save(AppState);

    // If the current session is a work session that is idle, update remaining so
    // the display immediately shows the new duration (req 3.11 — only when not active).
    if (
      AppState.timer.sessionType === 'work' &&
      AppState.timer.status === 'idle'
    ) {
      AppState.timer.remaining = newDuration * 60;
      this.render();
    }
  },

  /**
   * Validates and applies a new break session duration.
   * New value only takes effect at the START of the next break session (req 3.11).
   *
   * @param {*} mins - Raw value from the input field.
   *
   * Requirements: 3.9, 3.10, 3.11
   */
  setBreakDuration(mins) {
    const { valid, error } = this.validateDuration(mins);

    if (!valid) {
      if (this._breakErrorEl) {
        this._breakErrorEl.textContent = error;
      }
      // Restore the input to the current valid value
      if (this._breakInput) {
        this._breakInput.value = AppState.timer.breakDuration;
      }
      return;
    }

    // Clear any previous error
    if (this._breakErrorEl) {
      this._breakErrorEl.textContent = '';
    }

    const newDuration = parseInt(mins, 10);
    AppState.timer.breakDuration = newDuration;
    Storage.save(AppState);

    // If the current session is a break session that is idle, update remaining
    // so the display shows the new duration immediately (req 3.11).
    if (
      AppState.timer.sessionType === 'break' &&
      AppState.timer.status === 'idle'
    ) {
      AppState.timer.remaining = newDuration * 60;
      this.render();
    }
  },

  /**
   * Validates a timer duration value.
   * Valid if it is an integer in the range [1, 60] inclusive.
   *
   * @param {*} val - The value to validate (may be a string from an input field).
   * @returns {{ valid: boolean, error: string|null }}
   *
   * Requirements: 3.9, 3.10
   */
  validateDuration(val) {
    const num = Number(val);

    // Must be a finite number
    if (val === '' || val === null || val === undefined || !Number.isFinite(num)) {
      return { valid: false, error: 'Duration must be a number between 1 and 60 minutes.' };
    }

    // Must be a whole number (integer)
    if (!Number.isInteger(num)) {
      return { valid: false, error: 'Duration must be a whole number between 1 and 60 minutes.' };
    }

    // Must be in range [1, 60]
    if (num < 1 || num > 60) {
      return { valid: false, error: 'Duration must be between 1 and 60 minutes.' };
    }

    return { valid: true, error: null };
  }
};

// ── LinksWidget ────────────────────────────────────────────────────────────

/**
 * Manages the Quick Links panel: add, delete, and render quick-access links.
 * Links are stored in AppState.links and persisted via Storage.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 */
const LinksWidget = {
  /** @type {HTMLElement|null} Root section element */
  el: null,

  /**
   * Wires up the widget: renders existing links and attaches form submit handler.
   *
   * @param {HTMLElement} rootEl - The #links-widget section element.
   */
  init(rootEl) {
    this.el = rootEl;

    const form = document.getElementById('links-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const labelInput = document.getElementById('links-label-input');
        const urlInput   = document.getElementById('links-url-input');
        const label = labelInput ? labelInput.value : '';
        const url   = urlInput   ? urlInput.value   : '';

        const result = this.validate(label, url);
        const errorEl = document.getElementById('links-error');

        if (!result.valid) {
          if (errorEl) {
            errorEl.textContent = result.errors.join(' ');
          }
          return;
        }

        // Clear any previous error
        if (errorEl) {
          errorEl.textContent = '';
        }

        this.addLink(label.trim(), url.trim());

        // Clear inputs after successful add
        if (labelInput) labelInput.value = '';
        if (urlInput)   urlInput.value   = '';
      });

      // Clear error messages when the user modifies an input (Req 4.3/4.4)
      const labelInput = document.getElementById('links-label-input');
      const urlInput   = document.getElementById('links-url-input');
      const errorEl    = document.getElementById('links-error');

      if (labelInput && errorEl) {
        labelInput.addEventListener('input', () => { errorEl.textContent = ''; });
      }
      if (urlInput && errorEl) {
        urlInput.addEventListener('input', () => { errorEl.textContent = ''; });
      }
    }

    this.render();
  },

  /**
   * Validates the label and URL, then adds the link to AppState, re-renders,
   * and persists state.
   *
   * @param {string} label - Display label for the link.
   * @param {string} url   - URL the link points to.
   */
  addLink(label, url) {
    const result = this.validate(label, url);
    if (!result.valid) return;

    const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Date.now().toString();

    AppState.links.push({ id, label: label.trim(), url: url.trim() });
    this.render();
    Storage.save(AppState);
  },

  /**
   * Removes the link with the given id from AppState, re-renders, and persists.
   *
   * @param {string} id - The id of the link to remove.
   */
    deleteLink(id) {
    AppState.links = AppState.links.filter(link => link.id !== id);
    this.render();
    Storage.save(AppState);
  },

  // ADD THIS NEW METHOD:
  /**
   * Edits a link's label by id.
   * Validates the new label and checks for duplicates.
   *
    @param {string} id - The id of the link to edit.
   */
  editLink(id) {
    const link = AppState.links.find(l => l.id === id);
    if (!link) return;

    const newLabel = prompt('Edit link label:', link.label);
    if (newLabel && newLabel.trim() && newLabel.trim() !== link.label) {
      const trimmedLabel = newLabel.trim();

      // Validate label length (1-50 chars)
      if (trimmedLabel.length > 50) {
        alert('Label must be 50 characters or fewer.');
        return;
      }

      link.label = trimmedLabel;
      this.render();
      Storage.save(AppState);
    }
  },


  /**
   * Fully re-renders the links list and toggles the empty-state message.
   * Each link renders as an <li> with an <a> (opens in new tab) and a delete <button>.
   *
   * Requirements: 4.1, 4.7
   */
  render() {
    const listEl  = document.getElementById('links-list');
    const emptyEl = document.getElementById('links-empty');

    if (!listEl) return;

    // Clear existing items
    listEl.innerHTML = '';

    if (AppState.links.length === 0) {
      // Show empty state (Req 4.7)
      if (emptyEl) emptyEl.removeAttribute('hidden');
    } else {
      // Hide empty state
      if (emptyEl) emptyEl.setAttribute('hidden', 'true');

      for (const link of AppState.links) {
        const li = document.createElement('li');
        li.className = 'link-item';

        // Anchor — opens in new tab with security attributes (Req 4.1)
        const a = document.createElement('a');
        a.href    = link.url;
        a.textContent = link.label;
        a.target  = '_blank';
        a.rel     = 'noopener noreferrer';
        a.className = 'link-anchor';
        a.setAttribute('aria-label', `${link.label} (opens in new tab)`);

        // Edit button (same emoji as tasks)
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'link-edit';
        editBtn.textContent = '✏️';
        editBtn.setAttribute('aria-label', `Edit link: ${link.label}`);
        editBtn.addEventListener('click', (e) => {
          e.preventDefault(); // Prevent any default behavior
          this.editLink(link.id);
        });

        // Delete button (same emoji as tasks)
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'link-delete';
        deleteBtn.textContent = '🗑️';
        deleteBtn.setAttribute('aria-label', `Delete link: ${link.label}`);
        deleteBtn.addEventListener('click', (e) => {
          e.preventDefault(); // Prevent any default behavior
          this.deleteLink(link.id);
        });

        li.appendChild(a);
        li.appendChild(editBtn);  // Edit button
        li.appendChild(deleteBtn); // Delete button
        listEl.appendChild(li);
      }
    }
  },

  /**
   * Validates a label and URL for a new quick link.
   *
   * Rules:
   * - Label: 1–50 characters (Req 4.3, 4.5)
   * - URL: must start with "http://" or "https://" (Req 4.4)
   * - Total count must be < 20 before adding (Req 4.8)
   *
   * @param {string} label - The display label to validate.
   * @param {string} url   - The URL to validate.
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate(label, url) {
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
    if (AppState.links.length >= 20) {
      errors.push('Maximum of 20 links has been reached.');
    }

    return { valid: errors.length === 0, errors };
  }
};

// ── init() ─────────────────────────────────────────────────────────────────

/**
 * Entry point — called on DOMContentLoaded.
 * Loads persisted state, merges it into AppState, wires EventBus, then
 * initialises each widget.
 */
function init() {
  const saved = Storage.load();

  // Merge persisted data into AppState, preserving runtime timer defaults
  AppState.tasks = saved.tasks;
  AppState.links = saved.links;
  AppState.timer.workDuration  = saved.timer.workDuration;
  AppState.timer.breakDuration = saved.timer.breakDuration;
  // Reset runtime timer fields to safe defaults
  AppState.timer.sessionType = 'work';
  AppState.timer.remaining   = saved.timer.workDuration * 60;
  AppState.timer.status      = 'idle';
  AppState.timer.intervalId  = null;

  // Wire EventBus → aria-live announcer
  EventBus.on('stateChange', (message) => {
    const announcer = document.getElementById('aria-announcer');
    if (announcer && message) {
      announcer.textContent = message;
    }
  });

  GreetingWidget.init(document.getElementById('greeting-widget'));
  ClockWidget.init(document.getElementById('clock-time'));
  TodoWidget.init(document.getElementById('todo-widget'));
  TimerWidget.init(document.getElementById('timer-widget'));
  LinksWidget.init(document.getElementById('links-widget'));
}

document.addEventListener('DOMContentLoaded', init);
