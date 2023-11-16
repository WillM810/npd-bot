'use strict';

import DISCORD from 'discord.js';

import BaseCommand from '../baseCommand.js';

import ROLES from '../../constants/roles.js'

export default class MuteCommand extends BaseCommand {
    execute(params) {
        this.ack();
        this.guild.members.fetch(params[1]).then(member => {
            member.roles.set([ROLES.MUTED]).then(member => {
                member.user.createDM().then(channel => {
                    channel.send(`You have been muted for rules violations.  You may appeal this decision to the State Board via direct message or any other communication method outside of the LPD Discord Server.`);
                })
                this.complete(`Member <@!${member.id}> muted.`);
            });
        });
    }
}