'use strict';

import HTTPS from 'https';

const monthMap = {
    'January': 0,
    'February': 1,
    'March': 2,
    'April': 3,
    'May': 4,
    'June': 5,
    'July': 6,
    'August': 7,
    'September': 8,
    'October': 9,
    'November': 10,
    'December': 11,
};

const GEO_URL = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&SingleLine=`;

export default class {
    static indent(tabs) {
        return new Array(tabs).fill('\t').join('');
    }

    static parseDate(date) {
        const parts = date.split(',').map(p => p.trim());
        const dateBits = `${parts[1]} ${parts[2]}`.split(' ');
        if (dateBits.length > 3) return NaN;
        return new Date(Number(dateBits[2]), monthMap[dateBits[0]], Number(dateBits[1]), 0, 0, 0);
    }

    static geoLookup(address) {
        return new Promise((resolve, reject) => {
            this.getHttpsRequest(`${GEO_URL}${address}`).then(r => {
                const res = JSON.parse(r.toString());
                if (res.candidates && res.candidates.length && res.candidates[0].score > 80) {
                    resolve(res.candidates[0]);
                } else {
                    reject(res);
                }
            });
        });
    }

    static postHttpsRequest(url, data, headers = {}) {
        if (!Object.keys(headers).map(k => k.toLowerCase()).includes('content-type')) headers['Content-Type'] = 'application/json';
        const options = {
            'method': 'POST',
            'headers': headers
        };
        return new Promise((resolve, reject) => {
            const request = HTTPS.request(url, options, res => {
                res.on('data', d => {
                    try {
                        const response = JSON.parse(d.toString());
                        resolve(response);
                    } catch (e) {
                        resolve(d.toString());
                    }
                });
            });

            request.on('error', console.error);
            if (headers['Content-Type'] === 'application/json') {
                request.write(JSON.stringify(data));
                request.end();
            } else {
                data.pipe(request);
            }
        });
    }

    static getHttpsRequest(url) {
        return new Promise(resolve => {
            const request = HTTPS.request(url, res => {
                const chunks = [];
                res.on('data', d => {
                    chunks.push(d);
                });
                res.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });
            });
            request.end();
        });
    }
}