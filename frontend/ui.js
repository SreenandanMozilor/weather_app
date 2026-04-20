import { WeatherDashboard } from '../backend/Main.js';
import { addToHistory, getHistory } from '../backend/SearchHistory.js';
import { createCard, createErrorCard, createSkeletonCard } from './weatherCard.js';

const dashboard = new WeatherDashboard();
let isCelsius = true; //Toggle - celsius / fahrenheit
let errorCards = []; // { id, message, type, cityName }

// --- DOM Elements ---
const grid = document.getElementById('weather-grid');
const addBtn = document.getElementById('add-city-button');
const searchInput = document.getElementById('city-name');
const unitToggle = document.querySelector('.unit-toggle');
const skeletonTemplate = document.getElementById('skeleton');

// --- Initialization ---
async function initApp() {

    showSkeleton(); 
    
    try {
        await dashboard.load();
    } catch (error) {
        console.error("Failed to initialize dashboard:", error);
        showToast(error.message, 'error'); // For displaying toast notification
    }
    
    // Render whatever we loaded
    renderGrid();
}

// --- Render Logic ---
function renderGrid() {
    grid.innerHTML = ''; // Clear grid first
    const cities = dashboard.getCities();

    // 1. The Empty State
    if (cities.length === 0 && errorCards.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🌍</div>
                
                <h2>No cities yet</h2>
                <p>Search for a city above to start tracking weather across the world.<br>You can track up to 8 cities at once.</p>
                <button class="add-first-city-btn">+ Add Your First City</button>
            </div>
        `;
        
        // Attach listener to the empty state button
        grid.querySelector('.add-first-city-btn')?.addEventListener('click', () => searchInput.focus());
        return;
    }

    // 2. Append Weather Cards
    cities.forEach(city => {
        const cardNode = createCard(city, isCelsius, () => {
            dashboard.removeCity({ location: city.location });
            renderGrid();
            showToast(`${city.location} removed`, 'success');
        });
        grid.appendChild(cardNode);
    });

    // 3. Append Error Cards
    errorCards.forEach(err => {
        const errNode = createErrorCard(
            err, 
            // onRemove callback
            () => {
                errorCards = errorCards.filter(e => e.id !== err.id);
                renderGrid();
            },
            // onRetry callback
            (cityName) => {
                // Remove the error card from the state and screen immediately
                errorCards = errorCards.filter(e => e.id !== err.id);
                renderGrid(); 
                
                // Fire the add logic directly!
                handleAddCity(cityName); 
            }
        );
        grid.appendChild(errNode);
    });
}

// --- Core Application Logic ---
async function handleAddCity(cityName) {
    // FIX: If the empty state is currently on screen, remove it
    const emptyState = grid.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    // 1. Show loading state
    const skeletonEl = createSkeletonCard();
    grid.appendChild(skeletonEl);

    try {
        // 2. Fetch and add
        const addedCity = await dashboard.addCity(cityName);
        addToHistory(addedCity.location);
        showToast(`${addedCity.location} was added to your dashboard`, 'success');
        
    } catch (error) {
        if (error.type === 'DUPLICATE' || error.type === 'LIMIT_REACHED') {
            showToast(error.message, 'error');
        } else {
            errorCards.push({ id: Date.now(), message: error.message, type: error.type, cityName });
        }
    } finally {
        // 4. Cleanup and render
        skeletonEl?.remove();
        renderGrid(); 
        // Note: If the fetch failed, renderGrid() will automatically put the empty state back
    }
}

function showSkeleton() {
    grid.innerHTML = '';
    grid.appendChild(createSkeletonCard());
}

const historyDropdown = document.getElementById('search-history');

// Live Search logic
let searchTimeout; // Used for debouncing

// 3. The Dropdown Renderer
function renderDropdownList(historyList, apiList, query = "") {
    // Remove duplicates (if an API suggestion is already in our history)
    const filteredApiList = apiList.filter(apiCity => !historyList.includes(apiCity));

    if (historyList.length === 0 && filteredApiList.length === 0) {
        historyDropdown.style.display = 'none';
        return;
    }

    historyDropdown.style.display = 'block';
    
    let html = '';

    // Render History Matches
    if (historyList.length > 0) {
        html += `<div class="dropdown-section-title">Recent Searches</div>`;
        html += historyList.map(city => `
            <div class="history-item" data-city="${city}">
                <span>🕒 ${highlightMatch(city, query)}</span>
            </div>
        `).join('');
    }

    // Render API Suggestions
    if (filteredApiList.length > 0) {
        html += `<div class="dropdown-section-title">Global Cities</div>`;
        html += filteredApiList.map(city => `
            <div class="history-item" data-city="${city}">
                <span>📍 ${highlightMatch(city, query)}</span>
            </div>
        `).join('');
    }

    historyDropdown.innerHTML = html;
}

// 4. Helper function to make the matching letters bold
function highlightMatch(cityStr, query) {
    if (!query) return cityStr;
    const regex = new RegExp(`(${query})`, "gi");
    return cityStr.replace(regex, "<strong>$1</strong>");
}

// 5. Hide dropdown on click outside (Keeps your existing logic)
document.addEventListener('click', (event) => {
    if (!searchInput.contains(event.target) && !historyDropdown.contains(event.target)) {
        historyDropdown.style.display = 'none';
    }
});

// --- TOAST NOTIFICATION SYSTEM ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Create the toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    // Add it to the screen
    container.appendChild(toast);

    // Small delay to allow CSS to register the starting position before animating
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Remove it after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show'); // Slide out
        setTimeout(() => toast.remove(), 300); // Wait for animation to finish, then delete from DOM
    }, 3000);
}

// --- Event Listeners ---

// Show default history or live search when clicking on the search bar
searchInput.addEventListener('focus', () => {
    const query = searchInput.value.trim().toLowerCase();
    
    if (!query) {
        // If empty, show recent searches
        renderDropdownList(getHistory(), [], "");
    } else {
        // If there's already text in the bar, manually trigger the 'input' event to wake the dropdown back up
        searchInput.dispatchEvent(new Event('input'));
    }
});

// Live Search event listener
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const query = searchInput.value.trim().toLowerCase();

    if (!query) {
        renderDropdownList(getHistory(), [], query);
        return;
    }

    searchTimeout = setTimeout(async () => {
        // Filter history only if it matches
        const matchedHistory = getHistory().filter(city =>
            city.toLowerCase().startsWith(query) || city.toLowerCase().includes(query)
        );

        let apiSuggestions = [];
        try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
            if (res.ok) {
                const data = await res.json();
                if (data.results) {
                    apiSuggestions = data.results.map(r => `${r.name}, ${r.country}`);
                }
            }
        } catch (e) {}

        // Always show API suggestions; only show history if there are matches
        renderDropdownList(matchedHistory, apiSuggestions, query);
    }, 300);
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addBtn.click();
});

// Add city
addBtn.addEventListener('click', () => {
    const cityName = searchInput.value.trim();
    if (!cityName) return;

    // Reset UI
    searchInput.value = '';
    historyDropdown.style.display = 'none';
    
    handleAddCity(cityName);
});

// Unit Toggle
unitToggle.addEventListener('click', () => {
    isCelsius = !isCelsius;
    
    const celsiusLabel = document.querySelector('.celsius');
    const fahrenheitLabel = document.querySelector('.fahrenheit');
    
    if (isCelsius) {
        unitToggle.classList.remove('fahrenheit-active');
        celsiusLabel.classList.add('active');
        fahrenheitLabel.classList.remove('active');
    } else {
        unitToggle.classList.add('fahrenheit-active');
        fahrenheitLabel.classList.add('active');
        celsiusLabel.classList.remove('active');
    }
    
    renderGrid();
});

historyDropdown.addEventListener('click', (event) => {
    const clickedItem = event.target.closest('.history-item');
    if (!clickedItem) return; 

    const cityName = clickedItem.getAttribute('data-city');

    // Reset UI
    historyDropdown.style.display = 'none';
    searchInput.value = '';

    handleAddCity(cityName);
});

// --- DARK MODE LOGIC ---
const themeToggle = document.getElementById('theme-toggle');

// 1. Check local storage for a saved theme on load
const savedTheme = localStorage.getItem('weather_theme') || 'light';
if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeToggle.textContent = '☀️'; // Change icon to Sun
}

// 2. The Click Listener
themeToggle.addEventListener('click', () => {
    // Check what the current theme is
    const currentTheme = document.documentElement.getAttribute('data-theme');
    
    if (currentTheme === 'dark') {
        // Switch to Light Mode
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('weather_theme', 'light');
        themeToggle.textContent = '🌙';
    } else {
        // Switch to Dark Mode
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('weather_theme', 'dark');
        themeToggle.textContent = '☀️';
    }
});

// Start the engine
initApp();