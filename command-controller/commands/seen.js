'use strict';

import BaseCommand from '../baseCommand.js';
import FilePersistenceEngine from '../../utils/FilePersistenceEngine.js';

const PRESENCE_PERSISTANCE = new FilePersistenceEngine('./data/storage/presenceData');

export default class SeenCommand extends BaseCommand {
    static connected = false;
    static presenceData;

    execute(params) {
        if (params[2]) this.complete(this.seenRole(params[2]));
        else this.ephemeral(this.seenUser(params[1]));
    }

    seenRole(roleId) {
        this.ack();
        const members = this.guild.roles.resolve(roleId).members;
        return members.map(m => this.seenUser(m.user.id)).join('\n');
    }

    seenUser(memberId) {
        const presence = this.guild.presences.cache.get(memberId);
        if (presence && presence.status === 'online') return `<@!${memberId}> is online now.`;
        const lastPresence = SeenCommand.lastSeen(memberId);
        if (!lastPresence) return `<@!${memberId}> hasn't been seen...`;
        return `<@${memberId}> was last seen ${lastPresence.toLocaleString()}`;
    }

    static lastSeen(memberId) {
        const lastPresence = this.presenceData.find(p => p.user === memberId);
        if (!lastPresence) return null;
        else return new Date(lastPresence.lastSeen);
    }

    static updatePresence(userId) {
        const currentIndex = this.presenceData.findIndex(p => p.user === userId);
        if (currentIndex >= 0) this.presenceData.splice(currentIndex, 1);
        this.presenceData.push({
            'user': userId,
            'lastSeen': new Date().toISOString()
        });
        PRESENCE_PERSISTANCE.writeFile(this.presenceData);
    }

    static registerTracker(client) {
        if (this.connected) return console.log('Presence tracker already registered.');
        this.presenceData = PRESENCE_PERSISTANCE.readFile();
        if (!this.presenceData.length) PRESENCE_PERSISTANCE.writeFile(this.presenceData);
        client.on('presenceUpdate', (o, n) => {
            if (!o) return;
            if (o.status === 'online' && (n.status !== 'online' || !n)) {
                this.updatePresence(n.userID);
            }
        });
        client.on('messageUpdate', (o, n) => {
            this.updatePresence(o.author.id);
        });
        client.on('messageDelete', message => {
            this.updatePresence(message.author.id);
        });
        client.on('messageReactionAdd', (m, u) => {
            this.updatePresence(u.id);
        });
        client.on('messageReactionRemove', (m, u) => {
            this.updatePresence(u.id);
        });
        this.connected = true;
    }

    static handleMessage(message) {
        this.updatePresence(message.author.id);
    }
}