'use strict';

export default class Reactor {
    client;

    constructor(client) {
        this.client = client;
    }

    handleMessage(message) {
        if (message.content.toLowerCase().includes('npd') || message.content.toLowerCase().includes('libertarian party of delaware')) {
            message.react(':npd:989704388870291526');
        }

        if (message.content.toLowerCase().includes('dragon')) {
            message.react('🐲');
        }

        if (message.content.toLowerCase().includes('alligator')) {
            message.react('🐊')
        }
    
        if (message.mentions.members.has(this.client.user.id)) {
            message.react(':npd:989704388870291526');
        }
    }
}