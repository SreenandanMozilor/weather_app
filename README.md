# Skywatcher: Multi-City Weather Dashboard

## Project Overview
Skywatcher is a responsive, object-oriented weather dashboard built entirely with Vanilla JavaScript, HTML5, and CSS3. It leverages the Open-Meteo API for real-time weather data and the Open-Meteo Geocoding API for city lookups. The application allows users to search, add, and monitor the weather for up to eight cities globally, providing current conditions, a five-day forecast, and a highly polished, glassmorphism-inspired user interface that adheres to strict Figma design specifications.

## Core Features

### Functional Requirements
* **City Search & Geocoding:** Users can search for any global city. The app converts the city name to coordinates before fetching precise meteorological data.
* **Comprehensive Weather Cards:** Each dashboard card displays the location, current temperature, feels-like temperature, wind speed, humidity, visibility, and a dynamic weather condition icon.
* **Multi-City Support:** The dashboard tracks up to 8 cities simultaneously, arranged in a responsive CSS Grid.
* **Unit Toggling:** A custom-built, animated pill toggle allows the user to switch the entire dashboard between Celsius and Fahrenheit instantly. This conversion is handled purely client-side without triggering additional API requests.
* **Five-Day Forecast:** A compact daily forecast is rendered at the bottom of each card, displaying the day of the week, minimum/maximum temperatures, and daily weather condition icons.
* **Persistent Storage & Defensive Hydration:** Tracked cities and user preferences (like Dark Mode and search history) are saved to `localStorage`. The application includes defensive parsing to detect and gracefully reset corrupted JSON data upon hydration.
* **Automatic Geolocation:** On a user's first visit, the app utilizes the native browser Geolocation API paired with the BigDataCloud Reverse Geocoding API to automatically detect their current location and add their home city to the dashboard.
* **Auto-Refresh:** The weather data for every city on the dashboard is automatically refreshed every 10 minutes in the background using isolated closures.

### UI/UX & Design Features
* **Glassmorphism Design:** The UI utilizes semi-transparent backgrounds with backdrop-filters to create a modern, frosted-glass aesthetic over dynamic background colors.
* **Dark Mode:** A fully integrated dark mode theme that seamlessly transitions all application colors, borders, and shadows via CSS custom properties.
* **Debounced Live Search & Suggestions:** Typing in the search bar triggers a debounced (300ms) live lookup that merges the user's local search history with global API suggestions. Matched characters in the dropdown are dynamically highlighted in bold text.
* **Advanced Loading States:** Instead of basic spinners, the application uses CSS-animated shimmer skeleton cards that perfectly match the dimensions and layout of the real weather cards to prevent layout shifts during data fetching.
* **Contextual Error Routing:** Errors are intelligently routed based on their type. State-based errors (e.g., trying to add a duplicate city, exceeding the 8-city limit) trigger non-intrusive sliding Toast Notifications. API-based errors (e.g., Network Failures, City Not Found) render interactive Error Cards directly in the dashboard grid, complete with a Retry mechanism.
* **Empty Dashboard State:** When no cities are tracked, the grid collapses into a centralized, welcoming empty state prompt that guides the user to add their first location.
* **Pixel-Perfect Responsive Breakpoints:** Custom CSS Grid configurations adapt the layout strictly based on screen size: 1 column for mobile (under 640px), 2 columns for tablets (640px to 1024px), and auto-filling 3 to 4 columns for desktop (over 1024px).

### Technical & Architectural Specifications
* **Pure ES Modules:** The application is split into specialized files (`Main.js`, `Api.js`, `Geolocation.js`, `SearchHistory.js`, `ui.js`, `weatherCard.js`) utilizing native import/export syntax.
* **Object-Oriented State Management:** The core logic is housed within a `WeatherDashboard` class, utilizing ES2022 private fields (`#cities`, `#refreshIntervals`) to prevent external state mutation.
* **Modern Asynchronous JavaScript:** The codebase completely avoids `.then()` chains, relying strictly on `async/await` and `try/catch` blocks.
* **Concurrency Handling:** The `refreshAll` method utilizes `Promise.allSettled()` to fetch updates for multiple cities concurrently, ensuring that a single network failure does not crash the entire dashboard update.
* **Custom Error Subclassing:** A custom `WeAppError` class extending the native `Error` object allows for precise error type-checking and routing.
* **Functional Array Transformations:** Data manipulation strictly utilizes `.map()`, `.filter()`, and `.find()` to maintain immutability, completely avoiding imperative `for` loops.
* **Component-Based DOM Construction:** The view layer avoids massive `innerHTML` string replacements in the main controller by delegating DOM node creation to a dedicated component factory (`weatherCard.js`).

---

## Setup & Installation
1. Clone the repository to your local machine.
2. No build tools, Node modules, or API keys are required.
3. Open the `frontend/index.html` file in any modern web browser.
4. Note: Because the application uses native ES Modules, it must be run via a local server (such as VS Code Live Server or Python's `http.server`) to avoid CORS restrictions on local file imports.

---

## The Journey: Development Log & Retrospective

Building this application was a rigorous exercise in translating a static Figma design and a set of functional requirements into a scalable, robust JavaScript architecture. Below is a comprehensive documentation of the development process, highlighting the initial implementations, the doubts and mistakes encountered, and the architectural corrections that led to the final product.

### Phase 1: Backend Foundation and Object-Oriented Design
The project began by establishing a strict separation of concerns. The data-fetching logic was isolated in `Api.js`, utilizing the Open-Meteo Geocoding and Forecast endpoints. 
* **The Custom Error Class:** A `WeAppError` class was created to standardise how the application handles failures. By assigning a `type` property (e.g., NOT_FOUND, DUPLICATE), the frontend could later decide exactly how to display the error.
* **The Dashboard Class:** `Main.js` was built around the `WeatherDashboard` class. A key realization early on was protecting the internal array of cities. Instead of returning a direct reference, the `getCities()` method was designed to return a shallow copy using the spread operator. This prevented any rogue UI code from accidentally mutating the backend state.
* **The Auto-Refresh Closure:** Setting up the 10-minute auto-refresh required understanding closures. The `#startAutoRefresh` method created an interval that captured the specific city reference in memory, saving the interval ID into a private Map (`#refreshIntervals`) so it could be cleared if the user later removed the city.
* **Early Mistakes & Corrections:** In the `Api.js` file, a copy-paste error resulted in the forecast URL being used in the geocoding function. Because latitude and longitude were undefined at that stage, it threw an immediate Reference Error. This was quickly identified and replaced with the correct Geocoding URL. Additionally, I initially forgot to append `.js` extensions to the ES Module imports, which caused 404 errors in the browser environment.

### Phase 2: User Interface and Event Delegation
With the backend secure, the focus shifted to `ui.js`. Initially, the grid was rendered by mapping the city data into massive HTML template strings.
* **Event Delegation Discovery:** A major architectural milestone was handling the "Remove City" buttons. Initially, I considered attaching an event listener to every single card after rendering. However, learning about Event Delegation changed the approach. I attached a single click listener to the parent grid container.
* **The Closest() Method:** A bug surfaced where clicking the icon inside the remove button caused the event target to register as the icon rather than the button, breaking the removal logic. This was corrected by using `event.target.closest('.remove-btn')`, ensuring the script always found the button element regardless of exactly where the user clicked.
* **The Asynchronous Danger:** A bug was discovered in the `load()` method where `getGeoCityName` was called without an `await` keyword. This passed an unresolved Promise into the `addCity` method, which subsequently crashed the API call. Adding the missing `await` secured the loading sequence.

### Phase 3: The Search History and Debouncing
The Figma design required a search history dropdown. 
* **LRU Cache Implementation:** `SearchHistory.js` was built to act as a singleton module. The `addToHistory` function was designed to filter out a city if it already existed before pushing it to the array, effectively creating a "Least Recently Used" caching mechanism strictly limited to 5 items via `splice(0,1)`.
* **The Live Search Challenge:** Fetching global city suggestions on every keystroke would trigger API rate limits. I implemented Debouncing using `setTimeout` and `clearTimeout`, forcing the application to wait 300 milliseconds after the user stopped typing before making the API request.
* **The Upside-Down History Bug:** When rendering the dropdown, the oldest searches appeared at the top. I corrected this by modifying `getHistory()` to return a `.reverse()` copy of the array.
* **The Focus/Blur Edge Case:** I encountered a UX bug where clicking back into an already-filled search bar did not reopen the dropdown. This was resolved by capturing the `focus` event and manually dispatching a synthetic `input` event to wake the debouncer back up.

### Phase 4: Notifications and Error Routing
The assignment required both Toast notifications and in-card errors. 
* **The Routing Logic:** A strict separation was implemented in the `catch` blocks. If an error was a `DUPLICATE` or `LIMIT_REACHED`, it triggered a temporary, sliding Toast notification. If it was a network failure or a typo, an error object was pushed into a separate `errorCards` array.
* **Un-closeable Errors:** Initially, error cards were permanently stuck on the screen. I updated the HTML to include a close button and added logic to filter the dismissed error out of the `errorCards` state array.

### Phase 5: Styling, Glassmorphism, and Dark Mode
Translating the exact CSS values from Figma was a meticulous process.
* **Dynamic Styling:** Inline CSS variables were used to dynamically inject condition-specific colors (sunny, rainy, stormy) into the top border of the cards.
* **Dark Mode Pitfall:** Dark mode was implemented by swapping CSS variables globally via a `data-theme="dark"` attribute on the HTML root. However, the application header initially remained bright because its background color was hardcoded. This was fixed by writing specific CSS overrides for the header, search bar, and unit toggle tied specifically to the dark theme attribute.
* **Skeleton Alignment Collision:** When testing the empty state, adding a new city caused the loading skeleton to render at the bottom left of the screen instead of the top left. This happened because the Empty State container was utilizing `grid-column: 1 / -1`. I updated the `handleAddCity` function to explicitly remove the empty state from the DOM before appending the skeleton card.

### Phase 6: The Great Refactor
Towards the end of development, a thorough code review revealed that `ui.js` had become bloated with inline styles and complex HTML template literals. 
* **CSS Authority:** Hundreds of lines of inline styles were stripped out of the JavaScript files and moved into proper CSS classes in `styles.css`. This immediately cleaned up dark mode rendering issues.
* **Component Extraction:** `ui.js` was refactored from an HTML factory into a true View Controller. A new file, `weatherCard.js`, was created. This module exported functions (`createCard`, `createErrorCard`, `createSkeletonCard`) that returned actual DOM nodes instead of strings. 
* **Eliminating Event Delegation:** Because the cards were now generated as DOM nodes, I was able to attach event listeners directly to the buttons *inside* the component module, allowing me to completely delete the complex Event Delegation block in `ui.js`.
* **Removing Obscure Custom Events:** The retry logic for error cards previously relied on dispatching a synthetic `_retry` Custom Event. Recognizing this as an anti-pattern, I abstracted the core fetching sequence into a standalone `handleAddCity` helper function. This allowed the error card, the main search button, and the dropdown items to all share the exact same clean callback.

### Phase 7: Edge Cases and Final Polish
The final hours of development were spent hunting down insidious race conditions and edge-case bugs.
* **The Geolocation Fallthrough:** In `Geolocation.js`, a bug was found where unsupported browsers would throw a generic Type Error. This occurred because `reject()` was called, but the function lacked a `return` statement, causing the code to fall through. Adding the `return` fixed this.
* **Silent Reverse-Geocoding Failure:** Because Open-Meteo lacks reverse geocoding, I used BigDataCloud. If this API failed, it previously failed silently, leaving the user staring at an empty dashboard. I updated `Geolocation.js` to throw a `REVERSE_GEOCODE_ERROR`, caught it in `Main.js`, and surfaced it as a UI-friendly message via the Toast notification.
* **Defensive Hydration:** To prevent corrupted local storage data from crashing the app on startup, a dedicated `try/catch` was added to the `JSON.parse` block inside `Main.js` to detect malformed data, wipe the storage key, and safely boot up an empty state.
* **The Asynchronous Race Condition:** A critical bug was discovered in `refreshAll`. Because `Promise.allSettled` is asynchronous, a user could theoretically delete a city card while the background fetch was pending. The original code used strict array indices to overwrite data, meaning a shifted array would result in data overwriting the wrong city. This was refactored to use `.map()`, matching the incoming network data to the existing state array via the unique `location` string, making the application immune to asynchronous mutations.

### Conclusion
This project evolved from a basic API fetching script into a highly defensive, state-managed application. The process of making mistakes—from asynchronous race conditions to CSS grid collisions—and methodically refactoring them provided invaluable experience in building resilient, production-ready Vanilla JavaScript architectures.# Weather App Project

---

## Extra Features (Beyond Assignment Scope)

While the core application strictly adheres to the provided assignment brief and Figma designs, I took the initiative to build an additional feature to enhance the overall user experience:

* **One-Click Geolocation:** A custom, animated map-pin button was added to the header controls. When clicked, it utilizes the browser's native Geolocation API and BigDataCloud's reverse-geocoding to instantly detect and track the user's current city. This feature hooks directly into the existing application architecture, ensuring it perfectly respects the 8-city maximum limit, duplicate city checks, and error-routing logic.

### One-Click Geolocation Edge Cases & Robustness
Several critical edge cases were identified and patched to ensure production-level stability:
* **Regex Injection Prevention:** The live-search highlighter (`new RegExp`) was crashing when users typed special characters (like `(` or `*`). Input escaping was added to sanitize queries before regex evaluation.
* **Dangling Promises:** The geolocation loading animation was removing itself synchronously while the asynchronous `handleAddCity` function was still pending. An `await` keyword was added to synchronize the UI state with the network layer.
* **Infinite GPS Hangs:** The native Geolocation API lacks a default timeout, meaning restrictive networks could cause the app to hang indefinitely. An explicit `timeout` configuration (10 seconds) was added to ensure the error fallback always triggers safely.
* **Spam-Click Race Conditions:** Rapidly clicking the location button caused concurrent network requests and duplicate UI state mutations. A disable/enable toggle was implemented on the button during active transactions to prevent event spamming.