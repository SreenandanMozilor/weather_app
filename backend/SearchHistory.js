let searchHistory = JSON.parse(localStorage.getItem('weather_search_history')) || [];

export function addToHistory(cityName) {
    searchHistory = searchHistory.filter(c => { return c !== cityName});
    searchHistory.push(cityName);
    
    if(searchHistory.length > 5) {
        searchHistory.splice(0,1);
    }
    
    localStorage.setItem('weather_search_history', JSON.stringify(searchHistory));
}

export function getHistory() {
    return [...searchHistory].reverse();
}