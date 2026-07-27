# Requirements Document

## Introduction

The Animal Biome Explorer is a web-based feature that allows users to search for and browse animal species filtered by biome. Users can explore animals grouped by ecosystems such as rainforest, desert, tundra, ocean, and grassland. The feature is built on top of the existing static website project and presents information in an accessible, visually clear interface without requiring a backend server.

## Glossary

- **Explorer**: The Animal Biome Explorer web application, running in the user's browser.
- **Biome**: A major ecological community type (e.g., Rainforest, Desert, Tundra, Ocean, Grassland, Savanna, Wetlands, Taiga).
- **Animal_Card**: A visual UI component displaying a single animal species with its name, image, and associated biome(s).
- **Search_Bar**: The text input control that accepts a user-typed query to filter Animal_Cards.
- **Biome_Filter**: A set of selectable UI controls (buttons or chips) that restrict displayed Animal_Cards to one or more chosen Biomes.
- **Animal_Dataset**: The static collection of animal records embedded in the application, each containing a name, biome list, brief description, and image reference.
- **Results_Area**: The region of the page where matching Animal_Cards are displayed.
- **No_Results_State**: The UI state shown when no Animal_Cards match the current search and filter combination.

---

## Requirements

### Requirement 1: Browse Animals by Biome

**User Story:** As a user, I want to browse animals filtered by biome, so that I can discover which species live in a particular ecosystem.

#### Acceptance Criteria

1. THE Explorer SHALL display all available Biomes as selectable Biome_Filter options on page load.
2. WHEN a user selects a Biome_Filter option, THE Explorer SHALL update the Results_Area to show only Animal_Cards whose biome list includes the selected Biome.
3. WHEN a user selects a Biome_Filter option that is already active, THE Explorer SHALL deselect that filter and restore the Results_Area to show all Animal_Cards.
4. THE Explorer SHALL allow only one Biome_Filter option to be active at a time.
5. WHEN no Biome_Filter is active, THE Explorer SHALL display all Animal_Cards in the Results_Area.
6. IF the selected Biome_Filter produces zero matching Animal_Cards, THE Explorer SHALL display a message in the Results_Area indicating no animals were found for that biome.
7. WHEN a Biome_Filter option is active, THE Explorer SHALL render that option with a distinct visual style (e.g., highlighted background or border) that differs from inactive options.

---

### Requirement 2: Search Animals by Name

**User Story:** As a user, I want to search for an animal by name, so that I can quickly find a specific species without browsing all cards.

#### Acceptance Criteria

1. THE Explorer SHALL display a Search_Bar at the top of the page.
2. WHEN a user types a query into the Search_Bar, THE Explorer SHALL update the Results_Area within 300ms to show only Animal_Cards whose full display names contain the query string (case-insensitive).
3. WHEN the Search_Bar contains a query and a Biome_Filter is active, THE Explorer SHALL apply both filters simultaneously, showing only Animal_Cards that satisfy both conditions.
4. WHEN the Search_Bar is cleared, THE Explorer SHALL restore the Results_Area to reflect only the currently active Biome_Filter (or all cards if no filter is active).
5. THE Search_Bar SHALL accept a maximum query string length of 100 characters and ignore any characters entered beyond that limit.
6. IF the search query combined with the active Biome_Filter produces zero matching Animal_Cards, THE Explorer SHALL display the No_Results_State.

---

### Requirement 3: Display Animal Information

**User Story:** As a user, I want to see key information about each animal on its card, so that I can learn about the species at a glance.

#### Acceptance Criteria

1. THE Animal_Card SHALL display the animal's common name (up to 60 characters), biome label(s), a representative image, and a brief description (up to 150 characters).
2. WHEN an animal image is rendered, THE Explorer SHALL provide a non-empty alt text string describing the animal depicted.
3. IF an animal image fails to load, THEN THE Animal_Card SHALL display a placeholder image and retain all other card content unchanged.
4. THE Animal_Dataset SHALL contain at least 20 distinct animal records with at least one record assigned to each of the 8 defined Biomes.
5. IF an animal's common name or description exceeds its respective character limit, THE Animal_Card SHALL truncate the text at the limit and append an ellipsis ("…").

---

### Requirement 4: Handle No Results

**User Story:** As a user, I want to see a clear message when no animals match my search, so that I know my query returned no results rather than assuming the page is broken.

#### Acceptance Criteria

1. WHEN the combined search query and Biome_Filter produce zero matching Animal_Cards, THE Explorer SHALL display the No_Results_State in the Results_Area.
2. WHEN the No_Results_State is displayed, THE Explorer SHALL show a human-readable message of no more than 200 characters indicating that no animals were found and suggesting the user modify the search term or Biome_Filter selection.
3. WHEN the No_Results_State is displayed, THE Explorer SHALL not render any Animal_Cards in the Results_Area.
4. WHEN a subsequent query change or filter change results in one or more matching Animal_Cards, THE Explorer SHALL replace the No_Results_State with the matching Animal_Cards.

---

### Requirement 5: Responsive Layout

**User Story:** As a user, I want to use the explorer on any device screen size, so that I can browse animals on both desktop and mobile.

#### Acceptance Criteria

1. THE Explorer SHALL display Animal_Cards in a single-column layout (each card occupying the full available width) on viewports narrower than 768px, down to a minimum supported width of 320px.
2. THE Explorer SHALL display Animal_Cards in a 2-column grid layout on viewports between 768px and 1199px (inclusive).
3. THE Explorer SHALL display Animal_Cards in a 3- to 4-column grid layout on viewports 1200px wide or wider, up to a maximum supported width of 2560px.
4. THE Search_Bar and Biome_Filter controls SHALL remain visible and usable at all supported viewport widths (320px–2560px) without overlapping or clipping.

---

### Requirement 6: Page Load Performance

**User Story:** As a user, I want the page to load quickly, so that I can start exploring without a long wait.

#### Acceptance Criteria

1. WHEN a user navigates to the Explorer page, THE Explorer SHALL render the initial set of Animal_Cards within 2 seconds of the page navigation starting, measured on a connection of at least 25 Mbps download speed.
2. THE Animal_Dataset SHALL be bundled with the initial page load as a static JavaScript data file, resulting in no additional network requests for animal data after the page has loaded.
3. IF the Animal_Dataset fails to load within 5 seconds of page navigation, THE Explorer SHALL display a user-visible error message in the Results_Area and provide a retry action to reload the dataset.
