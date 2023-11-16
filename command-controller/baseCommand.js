'use strict';

import DISCORD from 'discord.js';
import CREDS from '../constants/creds.js';
import ROLES from '../constants/roles.js';
import DISCORD_UTILS from '../utils/discord-utils.js';
import COMMAND_MAP from './commandMapper.js';

export default class BaseCommand {
    interaction;
    client;

    command;
    args;
    cmd;
    content;

    guild;
    roles;
    channel;
    member;

    acked = false;
    completed = false;

    static get cmdData() {
        if (this.class === this.prototype)
            return {
                'page': 2,
                'perm': [ ROLES.ADMIN ],
                'validator': /^$/,
                'desc': `Simple test command to verify the bot is functioning.`,
                'syntax': [ '' ]
            };
        else if (Object.hasOwn('cmdData', this.class)) return this.class.cmdData;
        else return Object.keys(COMMAND_MAP['npd']).find(k => COMMAND_MAP['npd'][k].class === this.class);
    }

    constructor(interaction, client) {
        this.interaction = interaction;
        this.client = client;

        this.command = interaction.data.options[0].value;
        this.args = this.command.split(/ +/);
        this.cmd = this.args.shift().toLowerCase();
        this.content = this.command.slice(this.cmd.length+1);

        this.guild = client.guilds.cache.get(interaction.guild_id);
        this.roles = this.guild?.roles.cache;
        this.channel = this.guild?.channels.cache.get(interaction.channel_id);
        this.member = interaction.member;
    }

    checkPermission() {
        if (this.command === 'clear' && this.channel.type === 'DM') return true;
        return DISCORD_UTILS.checkMemberRoles(this.member, (COMMAND_MAP['npd'][this.cmd].class.cmdData || COMMAND_MAP['npd'][this.cmd]).perm);
    }

    validate() {
        return (COMMAND_MAP['npd'][this.cmd].class.cmdData || COMMAND_MAP['npd'][this.cmd]).validator.exec(this.content);
    }

    preFlight() {
        if (!this.checkPermission()) return this.ephemeral(`You do not have permission to run \`${this.cmd}\``);
        const params = this.validate();
        if (!params) return this.ephemeral(`Invalid \`${this.cmd}\` request:\n\`${this.content}\``);
        return params;
    }

    execute(params) {
        this.responded = true;
        this.ephemeral('pong');
    }

    ack(ephemeral = true) {
        this.acked = true;
        const data = {
            'data': {
                'type': 5,
            }
        };

        if (ephemeral) data['data']['data'] = { 'flags': 64 };
        this.client.api.interactions(this.interaction.id, this.interaction.token).callback.post(data);
    }

    complete(content = { 'content': 'done' }, embeds = null) {
        this.completed = true;
        const data = {};
        if (typeof content === 'object') Object.assign(data, content);
        else {
            if (typeof content === 'string') data['content'] = content;
            if (embeds instanceof Array) data['embeds'] = embeds;
            else if (embeds instanceof DISCORD.MessageEmbed) data['embeds'] = [ embeds ];
            if (data['embeds'] && data['content'] === 'done') delete data['content'];
        }
        
        return new Promise(resolve => {
            this.client.api.webhooks(CREDS.id, this.interaction.token).messages['@original'].patch({ 'data': data }).then(m => {
                if (m.flags === 64) resolve(m);
                else this.channel.messages.fetch(m.id).then(resolve);
            });
        });
    }

    ephemeral(content = 'done') {
        this.acked = this.completed = true;
        const data = {
            'type': 4,
            'data': {
                'content': content,
                'flags': 64
            }
        };
        
        this.client.api.interactions(this.interaction.id, this.interaction.token).callback.post({ 'data': data });
    }

    static runCommand(interaction, client) {
        const base = new BaseCommand(interaction, client);
        const promises = [];
        if (!base.channel) {
            const user = base.client.users.resolve(interaction.user.id);
            promises.push(user.createDM());
        }

        Promise.all(promises).then(dmChannel => {
            if (dmChannel.length) {
                base.channel = dmChannel[0];
            }
            let cmdData = COMMAND_MAP['npd'][base.cmd];
            if (!cmdData) return base.ephemeral(`Invalid Command: \`${base.cmd}\``);

            const cmdClass = cmdData.class;
            const cmdInstance = new cmdClass(interaction, client);
            if (cmdInstance.cmdData) cmdData = cmdInstance.cmdData;
            else cmdInstance.cmdData = cmdData;
            if (!cmdInstance.channel) cmdInstance.channel = base.channel;

            if (cmdData.disabled) return base.ephemeral(`Command Temporarily Disabled for Debugging: \`${base.cmd}\``);

            const params = cmdInstance.preFlight();
            if (!params) return;
            else cmdInstance.execute(params);
            if (!cmdInstance.acked) cmdInstance.ephemeral();
            if (cmdInstance.acked && !cmdInstance.completed) cmdInstance.complete();
        });
    }
}
