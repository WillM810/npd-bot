'use strict';

import DISCORD from 'discord.js'
import FS from 'fs';

import BaseCommand from '../baseCommand.js';

const LPD_LINKS = FS.readFileSync(process.cwd()+'/data/links.txt').toString().trim();

export default class LinksCommand extends BaseCommand {
    execute(params) {
        const linksEmbed = new DISCORD.MessageEmbed().setDescription(LPD_LINKS);
        this.channel.send({ embeds: [linksEmbed] });
    }
}