'use strict';

import cheerio from 'cheerio';

import BaseCommand from '../command-controller/baseCommand.js';
import ROLES from '../constants/roles.js';

import USERS from "../constants/users.js";
import UTILS from "../utils/utils.js";

const GEO_URL = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&SingleLine=`;
const DIS_URL = `https://enterprise.firstmap.delaware.gov/arcgis/rest/services/Boundaries/DE_Political_Boundaries/MapServer/1/query?f=json&geometryType=esriGeometryPoint&outFields=*&geometry=`;
const LEG_URL = `https://legis.delaware.gov/json/FindMyLegislator/GetFindMyLegislatorInfo?assemblyID=151&`

export default class LegLookup extends BaseCommand {
    static client;
    static cmdData = {
        'page': 1,
        'perm': [],
        'validator': /^[\s\S]+$/,
        'desc': `Looks up state and county legislators from a Delaware address.`,
        'syntax': [ `{address}` ],
        'params': {
            'address': {
                'optional': false,
                'desc': `The address to look up.  Providing at least a street address and zipcode will usually ensure results.`,
                'syntax': `{address}`
            }
        }
    }

    static setClient(client) {
        this.client = client;
        return this;
    }

    execute(params) {
        if (!params) return this.ephemeral(`No address provided...`);
        const lookupAddress = params[0];
        const dataRef = {};
        this.ack();

        UTILS.getHttpsRequest(`${GEO_URL}${lookupAddress}`).then(geoCode => {
            const geoCodeRes = JSON.parse(geoCode.toString());
            if (!geoCodeRes.candidates.length || geoCodeRes.candidates[0].score < 90) {
                dataRef.content = `Address not found...\n\n`
                if (geoCodeRes.candidates.length) dataRef.content += `Closest candidate was: ${geoCodeRes.candidates[0].address}`;
                return this.complete(dataRef.content);
            }
            const districtLookupPayload = {
                'x': geoCodeRes.candidates[0].location.x,
                'y': geoCodeRes.candidates[0].location.y,
                'spatialReference': { 'wkid': geoCodeRes.spatialReference.wkid }
            };
            dataRef.content = [ `Found address: ${geoCodeRes.candidates[0].address}` ];
            return this.complete(dataRef.content[0]).then(addressMsg => {
                UTILS.getHttpsRequest(`${DIS_URL.replace(/\/1\//, '/1/')}${escape(JSON.stringify(districtLookupPayload))}`).then(disLookupS => {
                    const disLookupResS = JSON.parse(disLookupS.toString());
                    const SD = disLookupResS.features[0].attributes['DISTRICT'];
                    const sName = disLookupResS.features[0].attributes['NAME'];
                    UTILS.getHttpsRequest(`${DIS_URL.replace(/\/1\//, '/2/')}${escape(JSON.stringify(districtLookupPayload))}`).then(disLookupR => {
                        const disLookupResR = JSON.parse(disLookupR.toString());
                        const RD = disLookupResR.features[0].attributes['DISTRICT'];
                        const rName = disLookupResR.features[0].attributes['NAME'];
                        UTILS.getHttpsRequest(`${DIS_URL.replace(/\/1\//, '/0/')}${escape(JSON.stringify(districtLookupPayload))}`).then(disLookupE => {
                            const disLookupResE = JSON.parse(disLookupE.toString());
                            console.log(disLookupResE.features);
                            const ED = disLookupResE.features[0].attributes['RDED'];
                            UTILS.getHttpsRequest(`${DIS_URL.replace(/\/1\//, '/3/')}${escape(JSON.stringify(districtLookupPayload))}`).then(disLookupC => {
                                const disLookupResC = JSON.parse(disLookupC.toString());
                                const CD = disLookupResC.features[0].attributes;

                                UTILS.postHttpsRequest(`${LEG_URL}districtNumber=${RD}&legislatorName=${escape(rName)}&chamberId=2`, {}).then(repData => {
                                    const $ = cheerio.load(repData);
                                    const rMail = $('a')[0].children[0].data;
                                    UTILS.postHttpsRequest(`${LEG_URL}districtNumber=${SD}&legislatorName=${escape(sName)}&chamberId=1`, {}).then(senData => {
                                        const $ = cheerio.load(senData);
                                        const sMail = $('a')[0].children[0].data;

                                        dataRef.content.push(`SD-${SD} - ${sName} - ${sMail}\nRD-${RD} - ${rName} - ${rMail}\nED: ${ED.split('-')[1]}`);
                                        dataRef.content.push(`${CD.TITLE} ${CD.COMMISSION} (${CD.COUNTY}-${CD.DISTRICT})`);
                                        dataRef.content.push(`${CD.TITLE_AL} ${CD.ATLARGE} (${CD.COUNTY}-AL)`);
                                        dataRef.content = dataRef.content.join('\n');

                                        this.complete(dataRef.content);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    }

    static handleMessage(message) {
        const reply = {
            'msg': {
                'data': {
                    'content': '',
                    'message_reference': {
                        'message_id': message.id
                    }
                }
            }
        };
        const dataRef = reply.msg.data;

        if (message.mentions.users.has(USERS.ME) && message.content.toLowerCase().includes('leglookup')) {
            const lookupAddress = message.content.substring(message.content.toLowerCase().indexOf('leglookup') + 10);
            if (!lookupAddress.length) {
                dataRef.content = 'No address provided...';
                return reply;
            }

            return {
                'msg': false,
                'cb': () => {
                    UTILS.getHttpsRequest(`${GEO_URL}${lookupAddress}`).then(geoCode => {
                        const geoCodeRes = JSON.parse(geoCode.toString());
                        if (!geoCodeRes.candidates.length || geoCodeRes.candidates[0].score < 90) {
                            dataRef.content = `Address not found...\n\n`
                            if (geoCodeRes.candidates.length) dataRef.content += `Closest candidate was: ${geoCodeRes.candidates[0].address}`;
                            return this.client.api.channels(message.channel.id).messages.post(reply.msg);
                        }
                        const districtLookupPayload = {
                            'x': geoCodeRes.candidates[0].location.x,
                            'y': geoCodeRes.candidates[0].location.y,
                            'spatialReference': { 'wkid': geoCodeRes.spatialReference.wkid }
                        };
                        dataRef.content = `Found address: ${geoCodeRes.candidates[0].address}`;
                        return this.client.api.channels(message.channel.id).messages.post(reply.msg).then(addressMsg => {
                            UTILS.getHttpsRequest(`${DIS_URL.replace(/\/1\//, '/1/')}${escape(JSON.stringify(districtLookupPayload))}`).then(disLookupS => {
                                const disLookupResS = JSON.parse(disLookupS.toString());
                                const SD = disLookupResS.features[0].attributes['DISTRICT'];
                                const sName = disLookupResS.features[0].attributes['NAME'];
                                UTILS.getHttpsRequest(`${DIS_URL.replace(/\/1\//, '/2/')}${escape(JSON.stringify(districtLookupPayload))}`).then(disLookupR => {
                                    const disLookupResR = JSON.parse(disLookupR.toString());
                                    const RD = disLookupResR.features[0].attributes['DISTRICT'];
                                    const rName = disLookupResR.features[0].attributes['NAME'];
                                    UTILS.getHttpsRequest(`${DIS_URL.replace(/\/1\//, '/0/')}${escape(JSON.stringify(districtLookupPayload))}`).then(disLookupE => {
                                        const disLookupResE = JSON.parse(disLookupE.toString());
                                        console.log(disLookupResE.features[0].attributes)
                                        const ED = disLookupResE.features[0].attributes['RDED'];
                                        UTILS.getHttpsRequest(`${DIS_URL.replace(/\/1\//, '/3/')}${escape(JSON.stringify(districtLookupPayload))}`).then(disLookupC => {
                                            const disLookupResC = JSON.parse(disLookupC.toString());
                                            const CD = disLookupResC.features[0].attributes;

                                            UTILS.postHttpsRequest(`${LEG_URL}districtNumber=${RD}&legislatorName=${escape(rName)}&chamberId=2`, {}).then(repData => {
                                                const $ = cheerio.load(repData);
                                                const rMail = $('a')[0].children[0].data;
                                                UTILS.postHttpsRequest(`${LEG_URL}districtNumber=${SD}&legislatorName=${escape(sName)}&chamberId=1`, {}).then(senData => {
                                                    const $ = cheerio.load(senData);
                                                    const sMail = $('a')[0].children[0].data;

                                                    dataRef.content = [ `SD-${SD} - ${sName} - ${sMail}\nRD-${RD} - ${rName} - ${rMail}\nED: ${ED.split('-')[1]}` ];
                                                    dataRef.content.push(`${CD.TITLE} ${CD.COMMISSION} (${CD.COUNTY}-${CD.DISTRICT})`);
                                                    if (CD.TITLE_AL) dataRef.content.push(`${CD.TITLE_AL} ${CD.ATLARGE} (${CD.COUNTY}-AL)`);
                                                    dataRef.content = dataRef.content.join('\n');

                                                    this.client.api.channels(message.channel.id).messages.post(reply.msg);
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                }
            };
        }
    }
}