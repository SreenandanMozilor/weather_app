import { WeAppError } from "./Error.js";

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

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,visibility&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto`;

        const response = await fetch(url);

        if(!response.ok) {
            throw new WeAppError("Failed to connect with OpenMeteo API", "OPENMETEO_ERROR")
        }

        const data = await response.json();

        const {current, daily} = data;

        const { temperature_2m, apparent_temperature, relative_humidity_2m, wind_speed_10m, weather_code } = current;

        const { temperature_2m_max, temperature_2m_min, weather_code: daily_code} = daily;

        return {
            location: `${name}, ${country}`,
            temp: temperature_2m,
            feelsLike: apparent_temperature,
            humidity: relative_humidity_2m,
            wind: wind_speed_10m,
            forecast : daily.time?.map((date, index) => ({
                date,
                max: temperature_2m_max[index],
                min: temperature_2m_min[index],
                code: daily_code[index]
            })).slice(0,5) ?? [], // nullish coalescing operator
            weatherCode: weather_code,
            visibility: (data.current.visibility / 1000).toFixed(1), // Convert meters to km
        }

    } catch (error){
        console.error("OpenMeteo failed: ", error.message);
        throw error;
    }
}

export {getCoordinates,getWeather};