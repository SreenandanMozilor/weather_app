class WeatherError extends Error{
    constructor(message, type){
        super(message, type)
        this.type = type;
        this.message = message;
        this.name = "WeatherError";
    }

    
}