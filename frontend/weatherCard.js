import { getWeatherClass, getWeatherIcon } from './ui-utils.js';

export function createCard(city, isCelsius, onRemove) {
    const themeClass = getWeatherClass(city.weatherCode);
    const displayTemp = isCelsius ? city.temp : (city.temp * 9/5 + 32);
    const displayFeels = isCelsius ? city.feelsLike : (city.feelsLike * 9/5 + 32);
    const unit = isCelsius ? '°C' : '°F';
    const currentIcon = getWeatherIcon(city.weatherCode);

    const card = document.createElement('div');
    card.className = `weather-card ${themeClass}`;
    card.setAttribute('data-location', city.location);

    card.innerHTML = `
        <button class="remove-btn">✖</button>
        <h2>${city.location}</h2>
        
        <div class="current-weather">
            <div>
                <h1 class="temp">${Math.round(displayTemp)}${unit}</h1>
                <p class="feels-like">Feels like: ${Math.round(displayFeels)}${unit}</p>
            </div>
            <div class="current-icon">${currentIcon}</div>
        </div>
        
        <div class="details">
            <span>💧 ${city.humidity}%</span>
            <span>💨 ${city.wind} km/h</span>
            <span>👁️ ${city.visibility} km</span>
        </div>
        
        <div class="forecast-grid">
            ${city.forecast.map((day, index) => `
                <div class="forecast-day">
                    <div class="day-name">${index === 0 ? 'TODAY' : new Date(day.date).toLocaleDateString('en-US', {weekday: 'short'})}</div>
                    <div class="day-icon">${getWeatherIcon(day.code)}</div>
                    <div class="day-max">${Math.round(isCelsius ? day.max : (day.max * 9/5 + 32))}°</div>
                    <div class="day-min">${Math.round(isCelsius ? day.min : (day.min * 9/5 + 32))}°</div>
                </div>
            `).join('')}
        </div>
    `;

    // Attach the event listener directly to the node!
    card.querySelector('.remove-btn').addEventListener('click', onRemove);
    
    return card;
}

export function createErrorCard(err, onRemove, onRetry) {
    const icon = err.type === 'NOT_FOUND' ? '🌐' : '⚡';
    const title = err.type === 'NOT_FOUND' ? 'City Not Found' : 'Network Error';
    const btnLabel = err.type === 'NOT_FOUND' ? 'Try Again' : '↺ Retry';
    
    const card = document.createElement('div');
    card.className = 'weather-card error-card';
    card.setAttribute('data-error-id', err.id);

    card.innerHTML = `
        <button class="remove-error-btn">✖</button>
        <div class="error-icon">${icon}</div>
        <h3>${title}</h3>
        <p>${err.type === 'NOT_FOUND' 
            ? `We couldn't find "${err.cityName}". Check the spelling.`
            : `Failed to fetch weather for "${err.cityName}".`}</p>
        <button class="retry-error-btn">${btnLabel}</button>
    `;

    // Attach event listeners directly
    card.querySelector('.remove-error-btn').addEventListener('click', onRemove);
    card.querySelector('.retry-error-btn').addEventListener('click', () => onRetry(err.cityName));
    
    return card;
}

export function createSkeletonCard() {
    const card = document.createElement('div');
    card.className = 'weather-card skeleton card';
    card.innerHTML = '<div class="shimmer"></div>';
    return card;
}