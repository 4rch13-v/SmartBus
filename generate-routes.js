const fs = require('fs');

const routes = [
    {
        id: "i-101",
        name: "Sarwate Bus Stand → Vijay Nagar Square",
        stops: [
            { id: "S1", name: "Sarwate Bus Stand", lat: 22.7127, lng: 75.8647 },
            { id: "S2", name: "Rajwada Palace", lat: 22.7196, lng: 75.8577 },
            { id: "S3", name: "Palasia Square", lat: 22.7244, lng: 75.8839 },
            { id: "S4", name: "Vijay Nagar Square", lat: 22.7533, lng: 75.8937 }
        ]
    },
    {
        id: "i-102",
        name: "Bhanwarkuan → Airport Road",
        stops: [
            { id: "S5", name: "Bhanwarkuan Square", lat: 22.6926, lng: 75.8676 },
            { id: "S6", name: "Tower Square", lat: 22.6979, lng: 75.8647 },
            { id: "S7", name: "Regal Circle", lat: 22.7214, lng: 75.8693 },
            { id: "S8", name: "Airport Road", lat: 22.7205, lng: 75.8399 }
        ]
    },
    {
        id: "i-103",
        name: "Gangwal Bus Stand → Bengali Square",
        stops: [
            { id: "S9", name: "Gangwal Bus Stand", lat: 22.7128, lng: 75.8409 },
            { id: "S10", name: "Malwa Mill", lat: 22.7369, lng: 75.8735 },
            { id: "S11", name: "LIG Square", lat: 22.7428, lng: 75.8906 },
            { id: "S12", name: "Bengali Square", lat: 22.7198, lng: 75.9061 }
        ]
    }
];

async function fetchRoute(stops) {
    const coords = stops.map(s => `${s.lng},${s.lat}`).join(';');
    const url = `http://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const res = await fetch(url, { headers: { 'User-Agent': 'SmartBusApp/1.0' } });
    const json = await res.json();
    if (json.routes && json.routes.length > 0) {
        return json.routes[0].geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
    }
    return stops.map(s => ({ lat: s.lat, lng: s.lng })); // fallback
}

async function generate() {
    for (const route of routes) {
        console.log(`Fetching OSRM for ${route.id}...`);
        route.routePath = await fetchRoute(route.stops);
    }
    fs.writeFileSync('routes.json', JSON.stringify(routes, null, 2));
    console.log('Saved to routes.json');
}

generate();

