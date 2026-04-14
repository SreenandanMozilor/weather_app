class WeatherError extends Error{
    constructor(message, type){
        super(message)
        this.type = type;
        this.name = "WeatherError";
    }
}

async function getCoordinates(city) {
    
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;

    try{
        const response = await (fetch(url));
        if(!response.ok){
            throw new WeatherError("Failed to connect with Geocoding server", "GEOCODE_ERROR");
        }

        const data = await response.json(); // .json() also returns a promise

        if(!data.results?.length){
            throw new WeatherError("City not found", "NOT_FOUND");
        }

        const { latitude, longitude, name, country } = data.results[0];

        return {latitude, longitude, name, country};

    } catch(error) {
        console.error("Geocoding failed: ", error.message);
        throw error; //to let the code calling getCoordinates() know that an error occured, else it will think that the function succeeded with the result being undefined
    }
}
