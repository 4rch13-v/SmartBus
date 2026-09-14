const fs = require('fs');

const stops = [
    { "id": "S1", "name": "Sarwate Bus Stand", "lat": 22.7127, "lng": 75.8647 },
    { "id": "S2", "name": "Rajwada Palace", "lat": 22.7196, "lng": 75.8577 },
    { "id": "S3", "name": "Palasia Square", "lat": 22.7244, "lng": 75.8839 },
    { "id": "S4", "name": "Vijay Nagar Square", "lat": 22.7533, "lng": 75.8937 }
];

const coords = stops.map(s => `${s.lng},${s.lat}`).join(';');
const url = `http://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

async function fetchRoute() {
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'SmartBusApp/1.0' }
        });
        const text = await res.text();
        console.log("Status:", res.status);
        try {
            const json = JSON.parse(text);
            if (json.routes && json.routes.length > 0) {
                const routeCoords = json.routes[0].geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
                fs.writeFileSync('route-path.json', JSON.stringify(routeCoords));
                console.log('Successfully saved route-path.json with', routeCoords.length, 'points');
            } else {
                console.error('No routes found in OSRM response');
            }
        } catch (e) {
            console.error('Error parsing JSON:', text.substring(0, 100));
        }
    } catch(e) {
        console.error(e);
    }
}
fetchRoute();

