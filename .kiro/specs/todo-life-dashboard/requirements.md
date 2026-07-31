# Requirements Document

## Introduction

The To-Do List Life Dashboard is a single-page web application that serves as a personal daily organizer. It displays the current date and time, a to-do list with task management, a focus (Pomodoro-style) timer, and a customizable set of quick-access website links. All data is persisted in the browser's Local Storage so no backend or setup is required. The dashboard is designed to be used as a standalone web page or set as a browser homepage.

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Task**: A user-defined to-do item with a text description and a completion state.
- **Task_List**: The collection of all Tasks managed by the Dashboard.
- **Focus_Timer**: A countdown timer widget that tracks focused work sessions and break intervals.
- **Session**: One active countdown period of the Focus_Timer (work or break).
- **Quick_Link**: A user-defined shortcut consisting of a display label and a URL.
- **Quick_Links_Panel**: The widget that displays and manages all Quick_Links.
- **Local_Storage**: The browser's `localStorage` API used as the sole persistence layer.
- **Clock**: The widget that displays the current date and time.
- **Dashboard_State**: The complete set of persisted data: Task_List contents, Focus_Timer configuration, and Quick_Links.

---

## Requirements

### Requirement 1: Live Clock Display

**User Story:** As a user, I want to see the current date and time on the dashboard, so that I can stay oriented throughout my day without switching tabs.

#### Acceptance Criteria

1. THE Clock SHALL display the current time in HH:MM:SS 24-hour format, updated once per second, with each update occurring within 100 milliseconds of the actual second boundary.
2. THE Clock SHALL display the current day of the week, full month name, day number, and four-digit year.
3. WHEN the system clock advances to a new second, THE Clock SHALL update the displayed time without requiring a page reload.
4. IF the browser tab becomes visible after being hidden, THE Clock SHALL reflect the current time within 100 milliseconds of becoming visible.
5. IF the system clock is unavailable or returns an invalid value, THEN THE Clock SHALL display a placeholder (e.g., "--:--:--") in place of the time and date.

---

### Requirement 2: To-Do List Management

**User Story:** As a user, I want to add, complete, and remove tasks from a to-do list, so that I can track what I need to accomplish during the day.

#### Acceptance Criteria

1. THE Task_List SHALL display all Tasks in the order they were added, with the most recently added task appearing last.
2. WHEN the user submits a non-empty text input (at most 200 characters), THE Task_List SHALL add a new Task with that text and a completion state of incomplete, and SHALL clear the input field.
3. IF the user submits an empty or whitespace-only text input, THEN THE Task_List SHALL not add a Task and SHALL display an inline validation message indicating that task text is required.
4. IF the user submits text input exceeding 200 characters, THEN THE Task_List SHALL not add a Task and SHALL display an inline validation message stating the 200-character limit.
5. WHEN the user activates the completion toggle for an incomplete Task, THE Task_List SHALL change that Task's completion state to complete and apply a strikethrough style to the Task text.
6. WHEN the user activates the completion toggle for a completed Task, THE Task_List SHALL change that Task's completion state back to incomplete and remove the strikethrough style.
7. WHEN the user activates the delete control for a Task, THE Task_List SHALL remove that Task from the Task_List permanently without requiring additional confirmation.
8. WHEN the user activates the "Clear Completed" control, THE Task_List SHALL remove all Tasks whose completion state is complete and preserve all incomplete Tasks.
9. WHEN the "Clear Completed" control is activated while no Tasks have a completion state of complete, THE Dashboard SHALL disable the "Clear Completed" control.
10. THE Task_List SHALL display a count of incomplete Tasks, updated immediately after any add, complete, or delete operation.
11. WHILE the Task_List contains no Tasks, THE Dashboard SHALL display an empty-state message in place of the task list body and SHALL hide the "Clear Completed" control.

---

### Requirement 3: Focus Timer

**User Story:** As a user, I want a countdown focus timer, so that I can use the Pomodoro technique to manage focused work sessions and breaks.

#### Acceptance Criteria

1. THE Focus_Timer SHALL default to a work session duration of 25 minutes and a break session duration of 5 minutes.
2. WHEN the user activates the Start control, THE Focus_Timer SHALL begin counting down from the current Session duration, updating the displayed time once per second.
3. WHEN the user activates the Pause control during a running Session, THE Focus_Timer SHALL halt the countdown and retain the remaining time at the exact second it was paused.
4. WHEN the user activates the Resume control after a paused Session, THE Focus_Timer SHALL continue the countdown from the retained remaining time.
5. WHEN the user activates the Reset control, THE Focus_Timer SHALL stop any running or paused Session, set the session type to work, and restore the display to the full configured work session duration.
6. WHEN a Session countdown reaches zero, THE Focus_Timer SHALL emit an audible alert lasting 1 to 3 seconds and automatically switch to the next Session type (work → break, break → work), beginning the new session in a paused state.
7. THE Focus_Timer SHALL display the current Session type ("Work" or "Break") alongside the countdown.
8. THE Focus_Timer SHALL display the remaining time in zero-padded MM:SS format (e.g., "04:07"), where MM is 00–59 and SS is 00–59.
9. WHERE the user configures custom session durations, THE Focus_Timer SHALL accept integer minute values between 1 and 60 inclusive for both work and break durations, with new values taking effect at the start of the next session of that type.
10. IF the user enters a non-integer or out-of-range value for a session duration, THEN THE Focus_Timer SHALL reject the input, retain the previous valid duration, and display an error message indicating the valid range (1–60 minutes).
11. IF the user configures a custom session duration while a Session of that type is currently active, THEN THE Focus_Timer SHALL apply the new duration only at the start of the next session of that type, leaving the current session unaffected.

---

### Requirement 4: Quick Links Panel

**User Story:** As a user, I want to add and manage quick-access links to websites, so that I can navigate to frequently used pages directly from the dashboard.

#### Acceptance Criteria

1. THE Quick_Links_Panel SHALL display all Quick_Links as clickable elements that open the target URL in a new browser tab.
2. WHEN the user submits a Quick_Link with a valid label (1–50 characters) and a valid URL, THE Quick_Links_Panel SHALL add the Quick_Link to the panel, displaying the label truncated to 50 characters if needed.
3. IF the user submits a Quick_Link with an empty label or an empty URL, THEN THE Quick_Links_Panel SHALL not add the Quick_Link and SHALL display an inline validation message identifying the missing field(s).
4. IF the user submits a Quick_Link with a URL that does not begin with `http://` or `https://`, THEN THE Quick_Links_Panel SHALL not add the Quick_Link and SHALL display an inline validation message stating that the URL must begin with `http://` or `https://`.
5. IF the user submits a Quick_Link with a label exceeding 50 characters, THEN THE Quick_Links_Panel SHALL not add the Quick_Link and SHALL display an inline validation message stating the 50-character label limit.
6. WHEN the user activates the delete control for a Quick_Link, THE Quick_Links_Panel SHALL remove that Quick_Link from the panel without requiring additional confirmation.
7. WHILE the Quick_Links_Panel contains no Quick_Links, THE Dashboard SHALL display an empty-state message in place of the Quick_Links list.
8. IF the Quick_Links_Panel already contains 20 Quick_Links and the user attempts to add another, THEN THE Quick_Links_Panel SHALL not add the new Quick_Link and SHALL display an inline validation message stating that the maximum of 20 links has been reached.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my tasks, timer settings, and quick links to be saved automatically, so that my dashboard state is restored when I reopen or reload the page.

#### Acceptance Criteria

1. WHEN the user adds, completes, or deletes a Task, THE Dashboard SHALL persist the updated Task_List to Local_Storage within 500ms.
2. WHEN the user adds or deletes a Quick_Link, THE Dashboard SHALL persist the updated Quick_Links to Local_Storage within 500ms.
3. WHEN the user changes Focus_Timer session durations, THE Dashboard SHALL persist the updated configuration to Local_Storage within 500ms.
4. WHEN the Dashboard loads, THE Dashboard SHALL read Dashboard_State from Local_Storage and restore the Task_List, Quick_Links, and Focus_Timer configuration to their last saved state before rendering any user-visible content.
5. IF Local_Storage is unavailable or returns a parse error on load, THEN THE Dashboard SHALL initialize with an empty Task_List, empty Quick_Links, and default Focus_Timer durations (25 min work, 5 min break), and SHALL display a non-blocking notification informing the user that saved data could not be loaded.
6. IF a write to Local_Storage fails during a save operation, THEN THE Dashboard SHALL display a non-blocking notification informing the user that the current change could not be saved.
7. THE Dashboard SHALL store Dashboard_State as a single JSON object under a fixed key in Local_Storage, replacing any previously stored value for that key on each save.

---

### Requirement 6: Responsive Layout

**User Story:** As a user, I want the dashboard to be usable on different screen sizes, so that I can use it on both desktop and tablet devices.

#### Acceptance Criteria

1. THE Dashboard SHALL render all four widgets (Clock, Task_List, Focus_Timer, Quick_Links_Panel) in a layout with at least 2 columns on viewports 768px wide or wider.
2. THE Dashboard SHALL reflow to a single-column stacked layout on viewports narrower than 768px, with each widget occupying 100% of the viewport width.
3. THE Dashboard SHALL remain fully operable at any viewport width between 320px and 2560px, with no widget content clipped, overlapping, or causing horizontal scrolling.
4. WHEN widget content exceeds the available column width, THE Dashboard SHALL wrap or scroll the content within the widget boundary without affecting other widgets.

---

### Requirement 7: Accessibility

**User Story:** As a user, I want the dashboard to be keyboard-navigable and screen-reader compatible, so that it is usable regardless of input method or assistive technology.

#### Acceptance Criteria

1. THE Dashboard SHALL ensure all interactive controls (buttons, inputs, links) are reachable and operable via keyboard Tab and Enter/Space navigation, and SHALL display a visible focus indicator on the currently focused element.
2. THE Dashboard SHALL provide a descriptive `aria-label` or visible label of at least 1 character that describes the control's purpose for every interactive control.
3. WHEN the Focus_Timer Session type changes or the countdown updates, THE Dashboard SHALL announce the change to screen readers using an `aria-live="polite"` region.
4. WHEN a Task is added or removed, THE Dashboard SHALL announce the updated Task count to screen readers using an `aria-live="polite"` region with a format such as "N tasks remaining".
5. THE Dashboard SHALL maintain a color contrast ratio of at least 4.5:1 between text and background for all visible text elements, in accordance with WCAG 2.1 AA.
6. WHEN a keyboard user triggers an action that is currently unavailable (e.g., activating a disabled control), THE Dashboard SHALL announce the reason the action is unavailable via an `aria-live="assertive"` region.
7. IF the Dashboard displays any modal or overlay, THEN THE Dashboard SHALL trap keyboard focus within the modal while it is open and restore focus to the triggering element when the modal is closed.
