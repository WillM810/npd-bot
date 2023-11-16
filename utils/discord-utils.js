'use strict';

import DISCORD from 'discord.js';

export default {
    'checkMemberRoles': (member, roleArray) => {
        if (!roleArray.length) return true;
        if (member.roles instanceof DISCORD.Collection) {
            const roleCollection = new DISCORD.Collection(roleArray.map(r => [r, null]));
            return member.roles.cache.intersect(roleCollection).size;
        } else if (member.roles instanceof Array) {
            return member.roles.filter(r => roleArray.includes(r)).length;
        }
    },

    'PresenceTracker': class {
        static trackers = [];

        static init(client) {
            client.on('presenceUpdate', (o, n) => {
                this.trackers.forEach(t => {
                    if (t.filter(o, n)) {
                        t.action(t.message, n.userID).then(m => {
                            t.message = m;
                        });
                    }
                });
            });
        }
    },

    'replyToMessage': (client, replyTo, message, channel) => {
        const data = { 'data': Object.assign(message, { 'message_reference': { 'message_id': replyTo } }) };
        return client.api.channels(channel).messages.post(data);
    }
}