'use strict';

import { MessageEmbed } from 'discord.js';

import BaseCommand from '../baseCommand.js';

import MongoPersistenceEngine from '../../utils/MongoPersistenceEngine.js';
import UTILS from '../../utils/utils.js';

import CHANS from '../../constants/channels.js';
import ROLES from '../../constants/roles.js';

const GEO_URL = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&SingleLine=`;
const MEETING_INFO = {
    'NCC': [
        '__**New Castle County Meet & Greet:**__',
        'DATE',
        'McGlynns Pub',
        '108 Peoples Plaza',
        'Newark, DE 19702'
    ],
    'KENT': [
        '__**Kent County Meet & Greet:**__',
        'DATE',
        'McGlynn\'s Pub',
        '800 N State St.',
        'Dover, DE 19901'
    ],
    'SUSSEX': [
        '__**Sussex County Meet & Greet:**__',
        'DATE',
        'Seaford Grottos Pizza',
        '22925 Sussex Hwy.',
        'Seaford, DE 19973'
    ],
    'DISCORD': [
        '__**Discord Information**__',
        '*These events will also be connected to Discord in the <#814614336186089513> channel.  '+
        'Please join us there if you are unable to attend in person.  You can share [this link](https://discord.gg/ND8J8aAXa5) to invite friends.*'
    ]
}

export default class MeetingsCommand extends BaseCommand {
    static cmdData = {
        'page': 1,
        'perm': [ ROLES.STATE_BOARD, ROLES.ADMIN ],
        'validator': {
            'exec': params => {
                if (params === '') return true;
                else return [
                    params,
                    (/^(NCC|KENT|SUSSEX) /.exec(params) || [])[1],
                    (/date:\((\d \w+)\)/.exec(params) || [])[1],
                    (/name:\(([\s\S]+?)\)/.exec(params) || [])[1],
                    (/addr:\(([\s\S]+)\)/.exec(params) || [])[1],
                    (/(https:\/\/discord.gg\/[\w\d]+)/.exec(params) || [])[1]
                ];
            }
        },
        'desc': `Clears the messages in the <#${CHANS.MEETINGS_CHAN}> channel and posts an updated notice for county affiliate meetings, updates meeting info.`,
        'syntax': [ '', '{county} [date:({order} {day})] [addr:({address})] [name:({name})] [link:({link})]' ],
        'params': {
            'county': {
                'optional': false,
                'desc': 'County for which the meeting is being updated.',
                'syntax': '{county} [date:({order} {day})] [addr:({address})] [name:({name})] [{link}]',
                'params': {
                    'name': {
                        'optional': true,
                        'desc': 'Name of the venue.',
                        'syntax': '[name:({name})]',
                    },
                    'date': {
                        'optional': true,
                        'desc': 'The nth *day of each month.',
                        'syntax': '[date:({order} {day})]',
                        'params': {
                            'order': {
                                'optional': false,
                                'desc': 'The nth *day of each month.',
                                'syntax': '{order}'
                            },
                            'day': {
                                'optional': false,
                                'desc': 'The day of the week on which the meeting is held.',
                                'syntax': '{day}'
                            }
                        }
                    },
                    'addr': {
                        'optional': true,
                        'desc': 'The address of the venue.',
                        'syntax': '[addr:({addr})]'
                    },
                    'link': {
                        'optional': true,
                        'desc': 'Discord invite link to the relevant voice channel.',
                        'syntax': '[{link}]'
                    }
                }
            }
        }
    }

    execute(params) {
        if (this.interaction.channel_id) this.ack();
        MongoPersistenceEngine.connect('lpd-data', 'meetings').then(MEETING_PERSISTANCE => {
            let dbTask;
            if (params && params[1]) {
                dbTask = new Promise((resolve, reject) => {
                    MEETING_PERSISTANCE.readFile().then(meetingData => {
                        let countyMeeting = meetingData.find(d => d.county === params[1]);
                        if (!countyMeeting) {
                            countyMeeting = { 'county': params[1] };
                            meetingData.push(countyMeeting);
                        }
                        if (params[2]) {
                            countyMeeting['day'] = [ 'su', 'mo', 'tu', 'we', 'th', 'fr', 'sa' ]
                                    .indexOf(params[2].split(' ')[1].toLowerCase().substr(0, 2));
                            countyMeeting['order'] = (Number(params[2].split(' ')[0]) - 1) * 7;
                        }
                        if (params[3]) countyMeeting['name'] = params[3];
                        if (params[5]) countyMeeting['link'] = params[5];
                        if (!params[4]) MEETING_PERSISTANCE.writeFile(meetingData).then(r => { MEETING_PERSISTANCE.readFile().then(resolve); });
                        else UTILS.getHttpsRequest(`${GEO_URL}${params[4]}`).then(geoLookup => {
                            geoLookup = JSON.parse(geoLookup.toString());
                            if (!geoLookup.candidates || !geoLookup.candidates.length || geoLookup.candidates[0].score < 80)
                                return this.complete(`Address could not be found.\n${params[4]}`)
                            countyMeeting['addr'] = geoLookup.candidates[0].address.replace(',', '\n').split('\n').map(s => s.trim()).join('\n');
                            MEETING_PERSISTANCE.writeFile(meetingData).then(r => { MEETING_PERSISTANCE.readFile().then(resolve); });
                        });
                    });
                });
            } else if (params && params.length > 1) return this.complete('Please specify a county to update meeting info.');
            else dbTask = MEETING_PERSISTANCE.readFile();

            dbTask.then(meetingData => {
                const localeOptions = { 'weekday': 'long', 'year': 'numeric', 'month': 'long', 'day': 'numeric' };
                const today = new Date();
                const infoMsg = Object.assign({}, MEETING_INFO);
                const fields = meetingData.map(countyMeeting => {
                    let current = new Date(today.getFullYear(), today.getMonth());
                    let next = new Date(today.getFullYear(), today.getMonth() + 1);

                    while (current.getDay() !== countyMeeting['day']) current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
                    while (next.getDay() !== countyMeeting['day']) next = new Date(next.getFullYear(), next.getMonth(), next.getDate() + 1);
                    // current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
                    // next = new Date(next.getFullYear(), next.getMonth(), next.getDate() + 1);

                    current.setHours(19, 0);
                    next.setHours(19, 0);

                    let meetingDate = new Date(current.getFullYear(), current.getMonth(), current.getDate() + countyMeeting['order'], 19);
                    if (meetingDate < today) meetingDate = new Date(next.getFullYear(), next.getMonth(), next.getDate() + countyMeeting['order']);

                    return {
                        'county': countyMeeting.county,
                        'name': infoMsg[countyMeeting.county][0],
                        'value': [
                            meetingDate.toLocaleDateString(undefined, localeOptions) + ', 7p',
                            `[${countyMeeting.name}](${countyMeeting.link})`,
                            `[${countyMeeting.addr || 'Unknown'}](https://www.google.com/maps/place/${(countyMeeting.addr || 'Delaware').replace('\n', ',+').replace(/ /g, '+')})`
                        ].join('\n')+'\n'
                    };
                }).sort((x, y) => {
                    const xDate = new Date(x.value.split('\n')[0].split(',')[1]);
                    const yDate = new Date(y.value.split('\n')[0].split(',')[1]);
                    return xDate - yDate;
                });

                const embed = new MessageEmbed()
                embed.title = 'Monthly Meeting Information';
                fields.forEach(f => embed.fields.push(f));
                embed.fields.push({ name: infoMsg['DISCORD'][0], value: infoMsg['DISCORD'].filter((v, idx) => idx).join('\n') });

                this.guild.channels.cache.get(CHANS.MEETINGS_CHAN).messages.fetch().then(msgs => {
                    Promise.all(msgs.map(m => m.delete())).then(() => {
                        this.guild.channels.cache.get(CHANS.MEETINGS_CHAN).send({ embeds: [embed] }).then(() => {
                            this.guild.channels.cache.get(CHANS.MEETINGS_CHAN).send('https://discord.gg/ND8J8aAXa5');
                        });
                    });
                });
            });
        });
    }

    static refresh(client, channelId) {
        const channel = client.channels.cache.get(channelId);
        channel.messages.fetch().then(msgs => {
            const dates = msgs.at(1).embeds[0].fields.map(f => UTILS.parseDate(f.value.split('\n')[0])).filter(d => !isNaN(d));
            if (dates.reduce((a, v) => {
                        v.setHours(20, 0);
                        return a = a || v < Date.now();
                    }, false))
                new MeetingsCommand({ 'data': { 'options': [ { 'value': 'meetings' } ] }, 'guild_id': channel.guild.id }, client).execute(['']);
        });
    }
}
