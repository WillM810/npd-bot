'use strict';

import BaseCommand from '../baseCommand.js';

export default class SockCommand extends BaseCommand {
    execute(params) {
        let targetChannel;
        let sockMsg = params[2];
        if (params[1]) targetChannel = this.guild.channels.cache.get(params[1]);
        if (!targetChannel) targetChannel = this.channel;
        targetChannel.send(sockMsg.replace(/\\n/g, '\n'));
    }
}