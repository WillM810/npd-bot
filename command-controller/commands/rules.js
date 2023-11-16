'use strict';

import DISCORD from 'discord.js';
import FS from 'fs';

import FilePersistanceEngine from '../../utils/FilePersistenceEngine.js';

import BaseCommand from '../baseCommand.js';

import ROLES from '../../constants/roles.js';
import CHANS from '../../constants/channels.js';

const RULES = FS.readFileSync('./data/rules.txt').toString().trim();

const RULE_PERSISTANCE = new FilePersistanceEngine('./data/storage/ruleData');
const ruleData = RULE_PERSISTANCE.readFile();

const DONATION_EMBED = new DISCORD.MessageEmbed().setTitle('Donate to the NPD').setURL('https://paypal.me/NonPartisanDE')
        .setDescription(`The Governing Board of the NPD requires about $500/yr to keep the lights on.`+
            `  Every dollar donated after that goes to supporting our endorsed and nominated candidates and `+
            `participating in local outreach events and other activities to further promote our organization.  `+
            `Thank you for your support!`);

export default class RulesCommand extends BaseCommand {
    execute(params) {
        const rulesEmbed = new DISCORD.MessageEmbed().setDescription(RULES).setTitle('LPD Server Rules');
        this.channel.send(rulesEmbed).then(message => {
            message.react('🦔');
            while (ruleData.length) ruleData.pop();
            ruleData.push({ 'guildId': this.guild.id, 'channelId': this.channel.id, 'messageId': message.id });
            RULE_PERSISTANCE.writeFile(ruleData);
            RulesCommand.reconnectRules(this.client);
        });
    }

    static reconnectRules(client) {
        return new Promise(resolve => {
            if (!ruleData.length) {
                this.replaceRules(client, resolve);
            } else client.guilds.fetch(ruleData[0].guildId).then(guild => {
                guild.channels.resolve(ruleData[0].channelId).messages.fetch(ruleData[0].messageId).then(message => {
                    const rulesListener = message.createReactionCollector(() => true, { 'dispose': true });
                    rulesListener.on('collect', (r, u) => {
                        if (!u.bot) r.users.remove(u.id);
                        const hash = Buffer.from(r.emoji.name.toString()).toString('hex');
                        if (hash === 'f09fa694' || hash === '6c7064') {
                            guild.members.fetch(u.id).then(member => {
                                if (member.roles.cache.has(ROLES.GENERAL) || member.roles.cache.has(ROLES.MUTED)) return;
                                if (u.bot) return;
                                console.log(`Rules (accept): ${u.username}`);
                                guild.channels.resolve(CHANS.RULES_ACK_CHAN).send(`<@${u.id}> has accepted the rules.`);
                                u.createDM().then(channel => {
                                    channel.send('Thank you for agreeing to our rules.\n\nPlease consider donating to Non-Partisan Delaware.  '+
                                            'We rely on donors donors like you to fund all of our activities.\n\nThank you for your support!',
                                            new DISCORD.MessageEmbed(DONATION_EMBED));
                                });
                                member.roles.add(ROLES.GENERAL);
                                member.roles.remove(ROLES.RESTRICTED);
                            });
                        }
                    });
                    resolve();
                }, this.replaceRules(client, resolve));
            });
        });
    }

    static replaceRules(client, resolve) {
        return () => {
            while (ruleData.length) ruleData.pop();
            const fakeInteraction = {
                'data': {
                    'options': [{
                        'value': 'rules'
                    }]
                },
                'guild_id': CHANS.LPD_GUILD,
                'channel_id': CHANS.RULES_CHAN
            };

            new RulesCommand(fakeInteraction, client).execute();
            resolve();
        }
    }
}