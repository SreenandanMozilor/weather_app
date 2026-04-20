import { getGeoCityName, getUserLocation } from "./Geolocation.js";
import { getCoordinates, getWeather } from "./Api.js";
import { WeAppError } from "./Error.js";

class WeatherDashboard {
    #cities = [];
    #refreshIntervals = new Map();

    async addCity(cityName) {

        if (this.#cities.length >= 8) {
            throw new WeAppError("You can only track up to 8 cities.", "LIMIT_REACHED");
        }

        try {

            const data = await getWeather(cityName);

            const isDuplicate = this.#cities.find(c => c.location === data.location);

            if (isDuplicate) {
                throw new WeAppError("This city is already on your dashboard.", "DUPLICATE");
            }

            this.#cities.push(data);
            
            this.save();

            this.#startAutoRefresh(data);

            return data;

        } catch (error) {
            console.error("Dashboard error:", error.message);
            throw error; 
        }
    }

    removeCity(city) {
        
        const id = this.#refreshIntervals.get(city.location);
        clearInterval(id);
        this.#refreshIntervals.delete(city.location);
        console.log(`Stopped timer for ${city.location}`);

        this.#cities = this.#cities.filter(c => { return c.location !== city.location; });
        this.save();
        console.log(`Removed ${city.location}`);
    }

    async #startAutoRefresh(city) { 
        const refreshTask = async() => {
            console.log(`Auto-refreshing: ${city.location}`);

            try{
                const newData = await getWeather(city.location);
                this.#cities = this.#cities.map(c => {
                        if(c.location === city.location){ return newData; } 
                        else{return c;}
                    }
                );

                this.save();

            } catch (error) {
                console.error(`Refresh failed for ${city.location}`, error);
            }
        };

        const id = setInterval(refreshTask, 600000); // calls refreshTask every 10 mins

        this.#refreshIntervals.set(city.location, id);
    }

    async refreshAll() {
        // 1. Fire off the requests based on whatever is currently in the array
        const results = await Promise.allSettled(this.#cities.map(c => getWeather(c.location)));

        // 2. Extract only the successful payloads into a clean array
        const fulfilledData = results
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);

        // 3. Map over the CURRENT state of #cities, safely matching by location.
        // If a city was deleted mid-fetch, it won't be in this.#cities anymore, so the unused fetch data is safely ignored.
        // If a new city was added mid-fetch, it won't be in fulfilledData, so it just keeps its existing state.
        this.#cities = this.#cities.map(existingCity => {
            const freshData = fulfilledData.find(data => data.location === existingCity.location);
            return freshData ? freshData : existingCity; 
        });

        this.save();
    }

    save() {
        localStorage.setItem('weather_dashboard_cities', JSON.stringify(this.#cities));
    }

    async load() {
        const data = localStorage.getItem("weather_dashboard_cities");

        if(data) {
            try {
                this.#cities = JSON.parse(data) ?? []; // Nullish coalescing handles the edge case of 'null' string
            }catch(error){
                console.error("Corrupted Data...removing weather_dashboard_cities from localStorage");
                this.#cities = [];
                localStorage.removeItem("weather_dashboard_cities");
            }
        }

        if (this.#cities.length > 0) {
            await this.refreshAll();
            this.#cities.forEach(city => this.#startAutoRefresh(city));
        }

        if (this.#cities.length == 0) {
            try {
                const {lat, lon} = await getUserLocation();
                const cityName = await getGeoCityName(lat, lon);
                if (cityName) await this.addCity(cityName);
            } catch (geoError) {
                console.warn("Geolocation unavailable, showing empty state:", geoError.message); // Silent fail — empty state will render
                throw new WeAppError("Couldn't detect your city — try searching instead.", "GEO_FAIL"); // Throwing an error for UI to catch
            }
        }
    }

    getCities() {
        return [...this.#cities];// We return a shallow copy using the spread operator [...]. This prevents outside code from accidentally mutating the private #cities array.
    }
}

export {WeatherDashboard}