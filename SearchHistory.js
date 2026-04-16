let searchHistory = [];

export function addToHistory(cityName) {
    searchHistory = searchHistory.filter(c => { return c !== cityName});
    searchHistory.push(cityName)
    if(searchHistory.length>5) {searchHistory.splice(0,1);}
}