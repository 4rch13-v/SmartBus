const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const routes = JSON.parse(fs.readFileSync(path.join(__dirname, 'routes.json'), 'utf8'));

const congestedZones = [
   { name: "Rajwada Palace", lat: 22.7196, lng: 75.8577, radiusKm: 1.2 },
   { name: "Malwa Mill", lat: 22.7369, lng: 75.8735, radiusKm: 1.2 }
];

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const simulations = {};
routes.forEach(route => {
    route.stops.forEach(stop => {
        let minIdx = 0;
        let minDist = Infinity;
        for(let i = 0; i < route.routePath.length; i++) {
            let d = calculateDistance(stop.lat, stop.lng, route.routePath[i].lat, route.routePath[i].lng);
            if(d < minDist) { minDist = d; minIdx = i; }
        }
        stop.pathIndex = minIdx;
    });

    simulations[route.id] = {
        routeId: route.id,
        currentPathSegment: 0,
        segmentProgress: 0,
        busPosition: { lat: route.routePath[0].lat, lng: route.routePath[0].lng },
        routeData: route
    };
});

const BASE_BUS_SPEED_KM_H = 30;
const UPDATE_INTERVAL_SEC = 2;
const SIMULATION_SPEED_MULTIPLIER = 10;

const activeDriverState = {}; // routeId -> { isLive, lastSeen, lat, lng, socketId }
const VALID_DRIVER_PINS = ['1234', '9999', '0000']; 

io.on('connection', (socket) => {
    const routesMetadata = routes.map(r => ({ id: r.id, name: r.name, stops: r.stops, routePath: r.routePath }));
    socket.emit('initData', routesMetadata);

    socket.on('authenticateDriver', (data) => {
        if (VALID_DRIVER_PINS.includes(data.driverPin)) {
            socket.isAuthenticated = true;
            socket.emit('authSuccess', { message: 'Authentication successful' });
        } else {
            socket.emit('authFailed', { message: 'Invalid Driver PIN' });
        }
    });

    socket.on('driverLocationUpdate', (data) => {
        if (!socket.isAuthenticated) return;
        const routeId = data.routeId;
        
        activeDriverState[routeId] = {
            isLive: true,
            lastSeen: Date.now(),
            lat: data.lat,
            lng: data.lng,
            socketId: socket.id
        };

        const sim = simulations[routeId];
        if (!sim) return;

        // Snap to nearest route path index for ETAs ONLY (do not snap visual marker)
        let minIdx = 0; let minDist = Infinity;
        for(let i = 0; i < sim.routeData.routePath.length; i++) {
            let d = calculateDistance(data.lat, data.lng, sim.routeData.routePath[i].lat, sim.routeData.routePath[i].lng);
            if(d < minDist) { minDist = d; minIdx = i; }
        }
        sim.currentPathSegment = minIdx;
        sim.segmentProgress = 0; 

        // Set visual marker strictly to raw GPS coordinates
        sim.busPosition = { lat: data.lat, lng: data.lng }; 

        // Immediate Traffic check
        let currentSpeed = BASE_BUS_SPEED_KM_H;
        let trafficStatus = 'Normal'; let trafficColor = 'green';
        for (const zone of congestedZones) {
            const dist = calculateDistance(data.lat, data.lng, zone.lat, zone.lng);
            if (dist < zone.radiusKm) {
                currentSpeed = 12; trafficStatus = `Heavy Traffic (${zone.name})`; trafficColor = 'red'; break;
            } else if (dist < zone.radiusKm * 1.5) {
                currentSpeed = 18; trafficStatus = `Moderate Congestion (${zone.name})`; trafficColor = 'orange'; break;
            }
        }

        // Immediate ETA calculation
        const etas = [];
        for (let i = 0; i < sim.routeData.stops.length; i++) {
            let s = sim.routeData.stops[i];
            if (sim.currentPathSegment >= s.pathIndex) {
                etas.push({ stopId: s.id, name: s.name, etaMin: -1 });
            } else {
                let totalDist = 0;
                if (sim.currentPathSegment < sim.routeData.routePath.length - 1) {
                    const endCurrentPt = sim.routeData.routePath[sim.currentPathSegment + 1];
                    totalDist += calculateDistance(sim.busPosition.lat, sim.busPosition.lng, endCurrentPt.lat, endCurrentPt.lng);
                }
                for (let j = sim.currentPathSegment + 1; j < s.pathIndex; j++) {
                    totalDist += calculateDistance(sim.routeData.routePath[j].lat, sim.routeData.routePath[j].lng, sim.routeData.routePath[j + 1].lat, sim.routeData.routePath[j + 1].lng);
                }
                const etaHours = totalDist / currentSpeed; 
                const etaMin = Math.round(etaHours * 60);
                etas.push({ stopId: s.id, name: s.name, etaMin: etaMin });
            }
        }

        // INSTANT broadcast to all commuters
        io.emit('busUpdates', [{
            routeId: routeId,
            position: sim.busPosition,
            trafficStatus: trafficStatus,
            trafficColor: trafficColor,
            etas: etas,
            isLive: true
        }]);
    });

    socket.on('driverStopDuty', () => {
        if (!socket.isAuthenticated) return;
        for (const rId in activeDriverState) {
            if (activeDriverState[rId].socketId === socket.id) {
                activeDriverState[rId].isLive = false;
            }
        }
    });

    socket.on('disconnect', () => {
        for (const rId in activeDriverState) {
            if (activeDriverState[rId].socketId === socket.id) {
                activeDriverState[rId].isLive = false;
            }
        }
    });
});

function updateSimulations() {
    const updates = [];
    const now = Date.now();

    for (const routeId in simulations) {
        const sim = simulations[routeId];
        const routePath = sim.routeData.routePath;
        const stops = sim.routeData.stops;

        const driverState = activeDriverState[routeId];
        // Increased timeout to 60 seconds to prevent flapping
        const isLive = driverState && driverState.isLive && (now - driverState.lastSeen < 60000);

        if (isLive) {
            // Driver is active and updating. 
            // Skip simulation calculation entirely. Commuters receive updates from the driver directly.
            continue; 
        } else if (driverState && driverState.isLive) {
            // Mark offline if over 10s gap to resume smooth simulation fallback
            driverState.isLive = false;
        }

        // SIMULATION FALLBACK LOGIC
        let simSpeed = BASE_BUS_SPEED_KM_H;
        for (const zone of congestedZones) {
            const dist = calculateDistance(sim.busPosition.lat, sim.busPosition.lng, zone.lat, zone.lng);
            if (dist < zone.radiusKm) { simSpeed = 12; break; }
            else if (dist < zone.radiusKm * 1.5) { simSpeed = 18; break; }
        }
        
        let remainingDistanceKm = (simSpeed / 3600) * UPDATE_INTERVAL_SEC * SIMULATION_SPEED_MULTIPLIER;

        while (remainingDistanceKm > 0 && sim.currentPathSegment < routePath.length - 1) {
            const startPt = routePath[sim.currentPathSegment];
            const endPt = routePath[sim.currentPathSegment + 1];
            const segmentLengthKm = calculateDistance(startPt.lat, startPt.lng, endPt.lat, endPt.lng);
            const remainingSegLen = segmentLengthKm * (1 - sim.segmentProgress);

            if (remainingDistanceKm >= remainingSegLen) {
                remainingDistanceKm -= remainingSegLen;
                sim.currentPathSegment++;
                sim.segmentProgress = 0;
                if (sim.currentPathSegment < routePath.length) {
                    sim.busPosition = { lat: routePath[sim.currentPathSegment].lat, lng: routePath[sim.currentPathSegment].lng };
                }
            } else {
                const advance = segmentLengthKm > 0 ? (remainingDistanceKm / segmentLengthKm) : 1;
                sim.segmentProgress += advance;
                remainingDistanceKm = 0;
                sim.busPosition = {
                    lat: startPt.lat + (endPt.lat - startPt.lat) * sim.segmentProgress,
                    lng: startPt.lng + (endPt.lng - startPt.lng) * sim.segmentProgress
                };
            }
        }

        if (sim.currentPathSegment >= routePath.length - 1) {
            sim.currentPathSegment = 0;
            sim.segmentProgress = 0;
            sim.busPosition = { lat: routePath[0].lat, lng: routePath[0].lng };
        }

        let currentSpeed = BASE_BUS_SPEED_KM_H;
        let trafficStatus = 'Normal';
        let trafficColor = 'green';
        
        for (const zone of congestedZones) {
            const dist = calculateDistance(sim.busPosition.lat, sim.busPosition.lng, zone.lat, zone.lng);
            if (dist < zone.radiusKm) {
                currentSpeed = 12; trafficStatus = `Heavy Traffic (${zone.name})`; trafficColor = 'red'; break;
            } else if (dist < zone.radiusKm * 1.5) {
                currentSpeed = 18; trafficStatus = `Moderate Congestion (${zone.name})`; trafficColor = 'orange'; break;
            }
        }

        const etas = [];
        for (let i = 0; i < stops.length; i++) {
            let s = stops[i];
            if (sim.currentPathSegment >= s.pathIndex) {
                etas.push({ stopId: s.id, name: s.name, etaMin: -1 });
            } else {
                let totalDist = 0;
                if (sim.currentPathSegment < routePath.length - 1) {
                    const endCurrentPt = routePath[sim.currentPathSegment + 1];
                    totalDist += calculateDistance(sim.busPosition.lat, sim.busPosition.lng, endCurrentPt.lat, endCurrentPt.lng);
                }
                for (let j = sim.currentPathSegment + 1; j < s.pathIndex; j++) {
                    totalDist += calculateDistance(routePath[j].lat, routePath[j].lng, routePath[j + 1].lat, routePath[j + 1].lng);
                }
                const etaHours = totalDist / currentSpeed; 
                const etaMin = Math.round(etaHours * 60);
                etas.push({ stopId: s.id, name: s.name, etaMin: etaMin });
            }
        }

        updates.push({
            routeId: sim.routeId,
            position: sim.busPosition,
            trafficStatus: trafficStatus,
            trafficColor: trafficColor,
            etas: etas,
            isLive: false // It's generated by the simulation fallback
        });
    }

    if (updates.length > 0) {
        io.emit('busUpdates', updates);
    }
}

setInterval(updateSimulations, UPDATE_INTERVAL_SEC * 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`SmartBus tracking server running on port ${PORT}`);
});
