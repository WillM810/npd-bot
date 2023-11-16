'use strict';

import DISCORD from 'discord.js';

import BaseCommand from '../baseCommand.js';

import CHANS from '../../constants/channels.js'

export default class LinkCommand extends BaseCommand {
    execute(params) {
        const adminChannel = this.guild.channels.cache.get(CHANS.ADMIN_CHAN);
        adminChannel.send(params[1]).then(tempMsg => {
            setTimeout(() => {
                adminChannel.messages.fetch(tempMsg.id).then(message => {
                    let embed = new DISCORD.MessageEmbed(message.embeds[0]);
                    embed.url = embed.url || params[1];
                    embed.setTitle(params[2] || embed.title);
                    embed.setFooter(this.member.nick || this.member.user.username);
                    this.channel.send(embed);
                    tempMsg.delete({ 'timeout': 5000 });
                });
            }, 500);
        });
    }
}