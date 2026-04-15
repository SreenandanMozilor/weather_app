class WeAppError extends Error{
    constructor(message, type){
        super(message)
        this.type = type;
        this.name = "WeAppError";
    }
}

async function getCoordinates(cityName) {
    
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;

    try {
        const response = await fetch(url);

        if(!response.ok){
            throw new WeAppError("Failed to connect with Geocoding server", "GEOCODE_ERROR");
        }

        const data = await response.json(); // .json() also returns a promise

        if(!data.results?.length){
            throw new WeAppError("City not found", "NOT_FOUND");
        }

        const { latitude, longitude, name, country } = data.results[0];

        return {latitude, longitude, name, country};

    } catch(error) {
        console.error("Geocoding failed: ", error.message);
        throw error; //to let the code calling getCoordinates() know that an error occured, else it will think that the function succeeded with the result being undefined
    }
}

async function getWeather(cityName) {
    try {

        const { latitude, longitude, name, country } = await getCoordinates(cityName);

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;

        const response = await fetch(url);

        if(!response.ok) {
            throw new WeAppError("Failed to connect with OpenMeteo API", "OPENMETEO_ERROR")
        }

        const data = await response.json();

        const {current, daily} = data;

        const { temperature_2m, apparent_temperature, relative_humidity_2m, wind_speed_10m, weather_code } = current;

        const { temperature_2m_max, temperature_2m_min} = daily;

        return {
            location: `${name}, ${country}`,
            temp: temperature_2m,
            feelsLike: apparent_temperature,
            humidity: relative_humidity_2m,
            wind: wind_speed_10m,
            forecast : daily.time?.map((date, index) => ({
                date,
                max: temperature_2m_max[index],
                min: temperature_2m_min[index]
            })) ?? [] // nullish coalescing operator
        }

    } catch (error){
        console.error("OpenMeteo failed: ", error.message);
        throw error;
    }
}

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
    }

}