'use strict';

import BaseCommand from '../baseCommand.js';

export default class ClearCommand extends BaseCommand {
    execute(params) {
        this.channel.messages.fetch({ 'limit': 5 }).then(messages => {
            if (this.channel.type === 'DM') messages = messages.filter(m => m.author.id === this.client.user.id);
            Promise.all(messages.map(message => message.delete())).then(() => {
                if (messages.size) this.execute(params);
            }).catch(console.log);
        });
    }
}