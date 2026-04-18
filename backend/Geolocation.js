import { WeAppError } from "./Error.js";

function getUserLocation() {
    return new Promise((resolve, reject) => {
        if(!navigator.geolocation) {
            reject(new WeAppError("Geolocation unsupported","GEOLOC_UNSUPPORTED"));
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                resolve({
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude
                });
            },
            (error) => {
                reject(new WeAppError("Unable to get your current location", "GEOLOC_UNABLE"));
            }
        )
    })
}

async function getGeoCityName(lat, lon){
    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
    if(response.ok) {
        const data = await response.json();
        return data.city;
    }
}

export {getGeoCityName, getUserLocation};