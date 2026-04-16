import { getGeoCityName, getUserLocation } from "./Geolocation";
import { addToHistory } from "./SearchHistory";
import { getCoordinates, getWeather } from "./Api";
import { WeAppError } from "./Error";

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
        const results = await Promise.allSettled(this.#cities.map(c => {return getWeather(c.location)})); // We pass c.location because getWeather expects a string not object

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                this.#cities[index] = result.value;
            }
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
            const {lat, lon} = await getUserLocation();
            this.addCity(getGeoCityName(lat, lon));
        }
    }

}