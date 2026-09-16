const https = require('https');
const places = ['Bhanwarkuan Square Indore', 'Tower Square Indore', 'Regal Circle Indore', 'Airport Road Indore', 'Gangwal Bus Stand Indore', 'Malwa Mill Indore', 'LIG Square Indore', 'Bengali Square Indore'];
places.forEach(p => {
    https.get(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(p)}&format=json&limit=1`, {headers: {'User-Agent': 'SmartBusApp/1.0'}}, res => {
        let data = '';
        res.on('data', c => data+=c);
        res.on('end', () => {
            try {
                const j = JSON.parse(data);
                if(j.length > 0) console.log(p, j[0].lat, j[0].lon);
                else console.log(p, 'NOT FOUND');
            } catch(e) {}
        });
    });
});

