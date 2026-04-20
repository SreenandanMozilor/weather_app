import { WeAppError } from "./Error.js";

function getUserLocation() {
    return new Promise((resolve, reject) => {
        if(!navigator.geolocation) {
            reject(new WeAppError("Geolocation unsupported","GEOLOC_UNSUPPORTED"));
            return; //to prevent browsers which do not support geolocation to not fail (Browsers that lack geolocation would see a cryptic console error (TYPE ERROR) instead of GEOLOC_UNSUPPORTED if the return is not present as the code would then call navigator.geolocation.getCurrentPosition on undefined)
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

async function getGeoCityName(lat, lon) {
    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
    
    // Throw an error if the request fails
    if (!response.ok) {
        throw new WeAppError("Reverse geocoding failed", "REVERSE_GEOCODE_ERROR");
    }
    
    const data = await response.json();
    return data.city;
}

export {getGeoCityName, getUserLocation};