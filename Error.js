class WeAppError extends Error{
    constructor(message, type){
        super(message)
        this.type = type;
        this.name = "WeAppError";
    }
}

export {WeAppError};