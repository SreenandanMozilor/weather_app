import { WeatherDashboard } from '../backend/Main.js';
import { addToHistory, getHistory } from '../backend/SearchHistory.js';
import { getWeatherClass, getWeatherIcon } from './ui-utils.js';

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
    }
    
    // Render whatever we loaded
    renderGrid();
}

// --- Render Logic ---
function renderGrid() {
    const cities = dashboard.getCities();

    // The Empty State
    if (cities.length === 0 && errorCards.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                <h2>No cities yet</h2>
                <p>Search for a city above to start tracking weather across the world.<br>You can track up to 8 cities at once.</p>
                <button class="add-first-city-btn">+ Add Your First City</button>
            </div>
        `;
        return;
    }

    // The Grid Render (using the pipeline we discussed)
    let htmlString = cities.map(city => {
        const themeClass = getWeatherClass(city.weatherCode);
        const displayTemp = isCelsius ? city.temp : (city.temp * 9/5 + 32);
        const displayFeels = isCelsius ? city.feelsLike : (city.feelsLike * 9/5 + 32);
        const unit = isCelsius ? '°C' : '°F';
        const currentIcon = getWeatherIcon(city.weatherCode);

        return `
            <div class="weather-card ${themeClass}" data-location="${city.location}" style="--accent-color: var(--color-${themeClass})">
                <button class="remove-btn" data-target="${city.location}" style="position: absolute; top: 10px; right: 10px; border: none; background: transparent; cursor: pointer; font-size: 1.2rem;">✖</button>
                <h2 style="margin-bottom: 16px;">${city.location}</h2>
                
                <div class="current-weather" style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <h1 class="temp" style="font-size: 3.5rem; margin: 0; line-height: 1;">${Math.round(displayTemp)}${unit}</h1>
                        <p style="margin: 8px 0 0 0; color: var(--text-secondary); font-size: 1.1rem;">Feels like: ${Math.round(displayFeels)}${unit}</p>
                    </div>
                    <div style="font-size: 4rem; text-shadow: 0 4px 12px rgba(0,0,0,0.1);">${currentIcon}</div>
                </div>
                
                <div class="details" style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 0.9rem;">
                    <span>💧 ${city.humidity}%</span>
                    <span>💨 ${city.wind} km/h</span>
                    <span>👁️ ${city.visibility} km</span>
                </div>
                
                <div class="forecast-grid" style="display: flex; justify-content: space-between; gap: 8px; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 16px;">
                    ${city.forecast.map((day, index) => `
                        <div class="forecast-day" style="text-align: center; font-size: 0.85rem; flex: 1;">
                            <div style="color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase; font-size: 0.75rem; font-weight: 600;">${index === 0 ? 'TODAY' : new Date(day.date).toLocaleDateString('en-US', {weekday: 'short'})}</div>
                            <div style="font-size: 1.5rem; margin: 8px 0;">${getWeatherIcon(day.code)}</div>
                            <div><strong>${Math.round(isCelsius ? day.max : (day.max * 9/5 + 32))}°</strong></div>
                            <div style="color: var(--text-secondary);">${Math.round(isCelsius ? day.min : (day.min * 9/5 + 32))}°</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');

    let errorHtml = errorCards.map(err => {
        const icon = err.type === 'NOT_FOUND' ? '🌐' : '⚡';
        const title = err.type === 'NOT_FOUND' ? 'City Not Found' : 'Network Error';
        const btnLabel = err.type === 'NOT_FOUND' ? 'Try Again' : '↺ Retry';
        return `
        <div class="weather-card error-card" data-error-id="${err.id}">
            <button class="remove-error-btn" data-error-id="${err.id}" style="position: absolute; top: 10px; right: 10px; border: none; background: transparent; cursor: pointer; font-size: 1.2rem; color: var(--text-secondary);">✖</button>
            
            <div class="error-icon">${icon}</div>
            <h3>${title}</h3>
            <p>${err.type === 'NOT_FOUND' 
                ? `We couldn't find "${err.cityName}". Check the spelling.`
                : `Failed to fetch weather for "${err.cityName}".`}</p>
            <button class="retry-error-btn" data-error-id="${err.id}" data-city="${err.cityName}">${btnLabel}</button>
        </div>
    `;
    }).join('');

    grid.innerHTML = htmlString + errorHtml;
}

function showSkeleton() {
    grid.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const clone = skeletonTemplate.content.cloneNode(true);
        grid.appendChild(clone);
    }
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
        html += `<div style="font-size: 0.8rem; color: var(--text-secondary); padding: 8px 12px; background: #f9fafb;">Recent Searches</div>`;
        html += historyList.map(city => `
            <div class="history-item" data-city="${city}" style="padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #eee;">
                <span>🕒 ${highlightMatch(city, query)}</span>
            </div>
        `).join('');
    }

    // Render API Suggestions
    if (filteredApiList.length > 0) {
        html += `<div style="font-size: 0.8rem; color: var(--text-secondary); padding: 8px 12px; background: #f9fafb;">Global Cities</div>`;
        html += filteredApiList.map(city => `
            <div class="history-item" data-city="${city}" style="padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #eee;">
                <span>📍 ${highlightMatch(city, query)}</span>
            </div>
        `).join('');
    }

    historyDropdown.innerHTML = html;
}

// 4. Helper function to make the matching letters bold! (UX Polish)
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

// Show default history when clicked on empty search bar
searchInput.addEventListener('focus', () => {
    if (!searchInput.value.trim()) {
        renderDropdownList(getHistory(), [], "");
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

//Add city
addBtn.addEventListener('click', async () => {
    const cityName = searchInput.value.trim();
    if (!cityName) return;

    // Append a single skeleton without wiping the grid
    const clone = skeletonTemplate.content.cloneNode(true);
    grid.appendChild(clone);
    const skeletonEl = grid.lastElementChild;

    try {
        const addedCity = await dashboard.addCity(cityName);
        searchInput.value = '';
        historyDropdown.style.display = 'none';
        addToHistory(addedCity.location);
        showToast(`${addedCity.location} was added to your dashboard`, 'success');
    } catch (error) {
        // Route 1: State Errors get Toasts ONLY
        if (error.type === 'DUPLICATE' || error.type === 'LIMIT_REACHED') {
            showToast(error.message, 'error');
        } 
        // Route 2: API Errors get Cards ONLY
        else {
            errorCards.push({ id: Date.now(), message: error.message, type: error.type, cityName });
        }
    } finally {
        skeletonEl?.remove();
        renderGrid();
    }
});

addBtn.addEventListener('_retry', async (e) => {
    const cityName = e.detail;
    
    const clone = skeletonTemplate.content.cloneNode(true);
    grid.appendChild(clone);
    const skeletonEl = grid.lastElementChild;

    try {
        const added = await dashboard.addCity(cityName);
        addToHistory(added.location);
        showToast(`${added.location} added`, 'success');
    } catch (error) {
        // Route 1: State Errors get Toasts ONLY
        if (error.type === 'DUPLICATE' || error.type === 'LIMIT_REACHED') {
            showToast(error.message, 'error');
        } 
        // Route 2: API Errors get Cards ONLY
        else {
            errorCards.push({ id: Date.now(), message: error.message, type: error.type, cityName });
        }
    } finally {
        skeletonEl?.remove();
        renderGrid();
    }
});

// Remove City & Empty State Actions (Using Event Delegation)
grid.addEventListener('click', (event) => {
    // 1. Check if they clicked the new Empty State button
    const addFirstBtn = event.target.closest('.add-first-city-btn');
    if (addFirstBtn) {
        searchInput.focus(); // Jump cursor to the search bar!
        return; // Stop here
    }

    // 2. Existing Remove button logic
    const removeBtn = event.target.closest('.remove-btn'); 

    if (removeBtn) {
        // Handle normal city removal
        const locationToRemove = removeBtn.getAttribute('data-target');
        dashboard.removeCity({ location: locationToRemove });
        renderGrid();
        
        showToast(`${locationToRemove} removed`, 'success'); 
    }

    const removeErrorBtn = event.target.closest('.remove-error-btn');
    if (removeErrorBtn) {
        const errorId = Number(removeErrorBtn.getAttribute('data-error-id'));
        // Filter out the dismissed error card
        errorCards = errorCards.filter(e => e.id !== errorId);
        renderGrid();
        return;
    }

    const retryBtn = event.target.closest('.retry-error-btn');
    if (retryBtn) {
        const errorId = Number(retryBtn.getAttribute('data-error-id'));
        const cityName = retryBtn.getAttribute('data-city');
        errorCards = errorCards.filter(e => e.id !== errorId);
        // Re-trigger add
        addBtn.dispatchEvent(new CustomEvent('_retry', { detail: cityName }));
        return;
    }
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

historyDropdown.addEventListener('click', async (event) => {
    // 1. Check if we clicked on a history item (or something inside it)
    // We use .closest() instead of classList.contains() just in case the user clicked directly on the <span> or the 🕒 emoji!
    const clickedItem = event.target.closest('.history-item');
    
    // If they clicked the container but not an item, do nothing
    if (!clickedItem) return; 

    // 2. Extract the city name from our custom data attribute
    const cityName = clickedItem.getAttribute('data-city');

    // 3. Hide the dropdown and clear the search bar (Good UI/UX)
    historyDropdown.style.display = 'none';
    searchInput.value = '';

    // 4. Run the exact same sequence as your "Add City" button
    const clone = skeletonTemplate.content.cloneNode(true);
    grid.appendChild(clone);
    const skeletonEl = grid.lastElementChild;

    try {
        const added = await dashboard.addCity(cityName);
        addToHistory(added.location);
    } catch (error) {
        // Route 1: State Errors get Toasts ONLY
        if (error.type === 'DUPLICATE' || error.type === 'LIMIT_REACHED') {
            showToast(error.message, 'error');
        } 
        // Route 2: API Errors get Cards ONLY
        else {
            errorCards.push({ id: Date.now(), message: error.message, type: error.type, cityName });
        }
    } finally {
        skeletonEl?.remove();
        renderGrid();
        renderDropdownList(getHistory(), [], ""); // Re-render the dropdown so the clicked city moves to the top
    }
});

// Start the engine
initApp();