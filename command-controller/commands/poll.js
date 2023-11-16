'use strict';

import DISCORD from 'discord.js';

import FilePersistenceEngine from '../../utils/FilePersistenceEngine.js';

import BaseCommand from '../baseCommand.js';

import DISCORD_UTILS from '../../utils/discord-utils.js';

import PERMS from '../../constants/permissions.js';
import ROLES from '../../constants/roles.js';
import CHANS from '../../constants/channels.js';
import Mailer from '../../utils/mailer.js';

const BOT_ROLES = [
    ROLES.LPD_BOT,
    ROLES.STATE_CHAIR
];

let voteId = 0;
const voteMap = { 'f09f918d': 'aye', 'f09f9aab': 'abstain', 'f09f918e': 'nay' };
const VOTE_PERSISTANCE = new FilePersistenceEngine('./data/storage/pollData');
const RESPONSES = [ `:+1: - Aye - 0 votes in favor`,
        `:no_entry_sign: - Abstain - 0 abstentions`,
        `:-1: - Nay - 0 votes against` ].join('\n');
const INSTRUCTIONS = [ `:grey_question: - Show current votes`,
        `<:whip:830972517598494740> - Whip outstanding votes`,
        `:arrows_counterclockwise: - Move poll to bottom`,
        `📨 - Close poll and publish result`,
        `:x: - Delete poll (DON'T)` ].join('\n');

export default class PollCommand extends BaseCommand {
    static voteData = VOTE_PERSISTANCE.readFile().filter(v => v.question);

    static generateEmbed(question, doneDate, url = null) {
        return new DISCORD.MessageEmbed({
            title: question,
            author: { name: 'Vote Called' },
            fields: [{
                name: 'React Below to Vote',
                value: RESPONSES
            }, {
                name: 'Instructions:',
                value: INSTRUCTIONS
            }],
            description: this.getDescriptionText(url, doneDate)
        });
    }

    static getDescriptionText(url, doneDate) {
        const dateText = [ `Closes ${doneDate.toLocaleDateString()}`,
                `${doneDate.toLocaleTimeString(undefined, { 'timeZoneName': 'short' })}` ].join(' @ ');

        return (url?`${url.trim().substr(4)}\n`:``)+dateText;
    }

    static getChannelVoterRoles(channel, roles) {
        return roles.filter(r => {
            if (!BOT_ROLES.includes(r.id) && (channel.parent.id !== CHANS.EXEC_SESSION_CAT || r.id === ROLES.STATE_BOARD)) {
                const permissions = channel.permissionsFor(r.id);
                return permissions.has(PERMS.REQD_VOTE_PERMS);
            } else return false;
        });
    }

    execute(params) {
        if (params[10]) return this.listPolls(params[10]);
        if (params[11]) return this.cancelPoll(params[11]);

        const initDate = this.getInitDate(params);
        if (isNaN(initDate)) return;
        const doneDate = new Date(initDate.getTime()+(48*60*60*1000));

        const question = params[9];
        if (question.length > 256) {
            return this.ephemeral(`Poll question is too long (${question.length})`);
        }
        const embed = PollCommand.generateEmbed(question, doneDate, params[6]);

        const filteredRoles = PollCommand.getChannelVoterRoles(this.channel, this.roles);
        if (!filteredRoles.filter(role => this.roles.has(role))) return this.ephemeral('No permission in this channel.');
        const roleMentions = filteredRoles.map(role => `<@&${role.id}>`).join(', ');

        const voteDetails = {
            'voteId': voteId++,
            'question': `${params[6] || ''} ${question}`.trim(),
            'initDate': initDate.toISOString(),
            'doneDate': doneDate.toISOString(),
            'roles': filteredRoles.map(r => r.id),
            'guild': this.guild.id,
            'channel': this.channel.id,
            'message': '-1',
            'votes': []
        };
        PollCommand.voteData.push(voteDetails);
        if (initDate <= new Date()) {
            this.channel.send({ content: `Poll for ${roleMentions}`, embeds: [embed] }).then(message => {
                voteDetails.message = message.id;
                this.supportPoll(message, voteDetails);
            });
        } else {
            VOTE_PERSISTANCE.writeFile(PollCommand.voteData);
            this.ephemeral(`Poll ${voteId-1} scheduled for ${initDate.toLocaleString()}`);
        }
    }

    listPolls(polls) {
        if (polls === '*') {
            if (PollCommand.voteData.filter(v => v.message === '-1' && v.question).length === 0) return this.ephemeral('No scheduled polls.');
            const pollList = PollCommand.voteData.filter(v => v.message === '-1')
                    .map(v => `${v.voteId} - ${v.question.replace(/url:(\[.+\])\(.+\) +(.+)/, '$2 $1')}: ${new Date(v.initDate).toLocaleString()}`)
                    .join('\n');
            return this.ephemeral(pollList);
        } else if (!isNaN(polls)) {
            const pollData = PollCommand.voteData.find(v => v.message === '-1' && v.question && v.voteId === Number(polls));
            if (!pollData) return this.ephemeral(`Poll ${polls} not found.`);
            const pollMsg = (`${pollData.voteId} - ${pollData.question.replace(/url:(\[.+\])\(.+\) +(.+)/, '$2 $1')}: `+
                    `${new Date(pollData.initDate).toLocaleString()}\n<#${pollData.channel}> ${pollData.roles.map(r => `<@&${r}>`)}\n`+
                    pollData.question.replace(/url:\[.+\]\((.+)\) +(.+)/, '$1')).trim();
            return this.ephemeral(pollMsg);
        } else return this.ephemeral(`Invalid poll id: ${polls}`);
    }

    cancelPoll(poll) {
        if (!isNaN(poll)) {
            const pollIndex = PollCommand.voteData.findIndex(v => v.voteId === Number(poll) && v.message === '-1');
            if (pollIndex === -1) return this.ephemeral(`Poll ${poll} not found.`);
            PollCommand.voteData.splice(pollIndex, 1);
            VOTE_PERSISTANCE.writeFile(PollCommand.voteData);
            return this.ephemeral(`Poll ${poll} deleted.`);
        } else return this.ephemeral(`Invalid poll id: ${poll}`);
    }

    getInitDate(params) {
        if (params[0].includes('init:') && !params[1]) return this.ephemeral(`Unrecognized date parameter: ${params[0]}`);
        if (!params[1]) return new Date();
        if (params[2]) {
            if (isNaN(new Date(params[2]))) return this.ephemeral(`Unrecognized date: ${params[2]}`);
            params[2] = new Date(params[2]);
            if (params[2].getFullYear() < new Date().getFullYear()) params[2].setFullYear(new Date().getFullYear());
        } else params[2] = new Date();
        if (params[5] && params[5] === 'p' && params[3] !== '12') params[3] = (Number(params[3])+12).toString();
        if (params[5] && params[5] === 'a' && params[3] === '12') params[3] = '00';
        params[1] = new Date(`${params[2].toDateString()} ${params[3]}:${params[4] || '00'}`);
        if (params[1] < new Date()) params[1].setDate(params[1].getDate()+1);
        if (params[1] < new Date()) return ephemeral(`Date has passed: ${params[1].toLocaleString()}`);

        return new Date(params[1]);
    }

    supportPoll(message, voteDetails) {
        voteDetails.message = message.id;
        VOTE_PERSISTANCE.writeFile(PollCommand.voteData);
        this.addPollReactions(message);
    
                
        message.pin().then(pinMsg => {
            pinMsg.channel.messages.fetch().then(msgs => {
                msgs.find(m => m.system).delete();
    
                this.registerListener(message, voteDetails);
            });
        });
    }
    
    addPollReactions(message) {
        message.react('👍');
        message.react('🚫');
        message.react('👎');
        message.react('❔');
        message.react(':whip:830972517598494740');
        message.react('🔄');
        message.react('📨');
        message.react('❌');
    }

    displayPoll(voteDetails) {
        const roleMentions = voteDetails.roles.map(role => `<@&${role}>`).join(', ');
        this.client.guilds.fetch(voteDetails.guild).then(guild => {
            const channel = guild.channels.cache.get(voteDetails.channel);
            if (channel.lastMessageID === voteDetails.message) return;
            channel.messages.fetch(voteDetails.message).then(message => {
                if (channel.lastMessageID === message.id) return;
                message.delete();
                const embed = new DISCORD.MessageEmbed(message.embeds[0]);
                channel.send({ content: `Poll for ${roleMentions}`, embeds: [embed] }).then(freshMsg => {
                    freshMsg.edit({
                        'content': `Poll for ${roleMentions}`,
                        'embeds': [embed]
                    });
                    this.supportPoll(freshMsg, voteDetails);
                });
            }, (e) => {
                const findUrl = voteDetails.question.match(/(url:\[.+\]\(.+\)) (.+)/) || [null,null,voteDetails.question];
                const embed = PollCommand.generateEmbed(findUrl[2], new Date(voteDetails.doneDate), findUrl[1]);
                channel.send({ content: `Poll for ${roleMentions}`, embeds: [embed] }).then(freshMsg => {
                    this.supportPoll(freshMsg, voteDetails);
                });
            });
        });
    }

    deletePoll(r, voteDetails, members, channel) {
        const now = new Date();
        const closingTime = new Date(voteDetails.doneDate);
        const pollData = voteDetails.question.match(/(url:(\[.+\]\(.+\)) +)?(.+)/);
        const tallyEmbed = new DISCORD.MessageEmbed({ 'title': pollData[3] });
        if (pollData[2]) tallyEmbed.description = pollData[2];
        const voteMsg = voteDetails.votes.map(vote => {
            const member = members.get(vote.user);
            if (member) return `${member.nickname || member.user.username} - ${vote.vote}`;
            else return `<@!${vote.user}> - ${vote.vote}`;
        }).join('\n');
        const closingString = now > closingTime?closingTime.toLocaleString():now.toLocaleString();
        tallyEmbed.addField(`Vote Results (as of ${closingString}):`, voteMsg || 'No votes recorded.');
        channel.send({ embeds: [tallyEmbed]});
        r.message.delete({ "timeout": 1000 });
        PollCommand.voteData.filter((vote, idx) => vote.voteId !== voteDetails.voteId || PollCommand.voteData.splice(idx, 1));
        VOTE_PERSISTANCE.writeFile(PollCommand.voteData);
        return tallyEmbed;
    }

    registerListener(message, voteDetails) {
        const guild = this.client.guilds.cache.get(voteDetails.guild);
        const channel = guild.channels.cache.get(voteDetails.channel);
        const embed = message.embeds[0];
        const reactions = message.createReactionCollector(() => true, {});
        reactions.on('collect', (r, u) => {
            if (u.bot) return;
    
            r.users.remove(u).catch();
            guild.members.fetch().then(members => {
                const voteHash = Buffer.from(r.emoji.toString()).toString('hex');
                const eligibleIds = members.filter(i => i.roles.cache.reduce((p, r) => p || voteDetails.roles.includes(r.id), false)).map(m => m.id);
                if (!eligibleIds.includes(u.id) && (voteHash !== 'e29d94') && (voteHash !== 'e29d8c')) return;
                const closingTime = new Date(voteDetails.doneDate);
                const now = new Date();
                console.log(voteHash);
                if ((voteHash === 'e29d8c' || voteHash === 'f09f93a8') || now > closingTime) {
                    if ((u.id !== guild.ownerID && !members.get(u.id).roles.cache.has(ROLES.STATE_CHAIR)) && now <= closingTime) return;
                    const resultEmbed = this.deletePoll(r, voteDetails, members, channel);
                    if (voteHash !== 'e29d8c') {
                        const roleNames = guild.roles.cache.filter(r => voteDetails.roles.includes(r.id)).map(r => r.name).join('/');
                        const urlParts = resultEmbed.description && resultEmbed.description.match(/\[(.*)\]\((.*)\)/);
                        const body = `<h3>${resultEmbed.title}</h3>${urlParts?`<a href="${urlParts[2]}">${urlParts[1]}</a>`:``}`+
                                `<h4>${resultEmbed.fields[0].name}</h4>${resultEmbed.fields[0].value.replace(/\n/g, '<br/>')}`;
                        Mailer.sendPollResult(`[${roleNames} Poll] - ${resultEmbed.title}`, body);
                    }
                } else if (voteHash === '3c3a776869703a3833303937323531373539383439343734303e') {
                    let voteMsg = eligibleIds.filter(id => !voteDetails.votes.map(v => v.user).includes(id))
                            .map(id => `<@!${id}>`).join(', ') + `, your votes are pending.`;
                    if (voteMsg.length > 1024) {
                        voteMsg = `${voteDetails.roles.map(r => `<@&${r}>`).join(', ')}.\n` + eligibleIds
                                .filter(id => !voteDetails.votes.map(v => v.user).includes(id)).length + ' votes outstanding.';
                    }
                    DISCORD_UTILS.replyToMessage(this.client, voteDetails.message, { 'content': voteMsg }, voteDetails.channel).then(msg => {
                        channel.messages.fetch(msg.id).then(m => setTimeout(() => m.delete(), 20000));
                    });
                } else if (voteHash === 'e29d94') {
                    let voteMsg = voteDetails.votes.map(vote => {
                        const member = members.get(vote.user);
                        if (member) return `${member.nickname || member.user.username} - ${vote.vote}`;
                        else return `<@!${vote.user}> - ${vote.vote}`;
                    }).join('\n') + '\n' + eligibleIds.filter(id => !voteDetails.votes.map(v => v.user).includes(id))
                            .map(id => `${members.get(id)?members.get(id).nickname || members.get(id).user.username:`<@!${id}>`} - Awaiting Vote`)
                            .join('\n');
                    if (voteMsg.length > 1024) {
                        voteMsg = voteDetails.votes.map(vote => {
                            const member = members.get(vote.user);
                            if (member) return `${member.nickname || member.user.username} - ${vote.vote}`;
                            else return `<@!${vote.user}> - ${vote.vote}`;
                        }).join('\n');
                        voteMsg += '\n' + eligibleIds.filter(id => !voteDetails.votes.map(v => v.user).includes(id)).length + ' votes outstanding.';
                    }
                    const pollData = voteDetails.question.match(/(url:(\[.+\]\(.+\)) +)?(.+)/);
                    const tallyEmbed = new DISCORD.MessageEmbed({ 'title': pollData[3] });
                    if (pollData[2]) tallyEmbed.description = pollData[2];
                    tallyEmbed.addField(`Vote Results (as of ${new Date().toLocaleString()}):`, voteMsg);
                    const infoMsg = {
                        'data': {
                            'embed': tallyEmbed,
                            'message_reference': { 'message_id': voteDetails.message }
                        }
                    }
                    if (!eligibleIds.includes(u.id)) u.createDM().then(channel => {
                        channel.send({ embeds: [tallyEmbed] });
                    });
                    else DISCORD_UTILS.replyToMessage(this.client, voteDetails.message, { 'embed': tallyEmbed }, voteDetails.channel).then(msg => {
                        channel.messages.fetch(msg.id).then(m => setTimeout(() => m.delete(), 20000));
                    });
                } else if (voteHash === 'f09f9484') {
                    channel.messages.fetch({ 'limit': 1 }).then(m => {
                        if (!m.has(voteDetails.message))
                            this.displayPoll(voteDetails);
                    });
                } else {
                    console.log(voteHash);
                    const votes = { 'f09f918d': 0, 'f09f9aab': 0, 'f09f918e': 0 };
                    const embedUpdate = new DISCORD.MessageEmbed(embed);
                    const currentVoteIdx = voteDetails.votes.findIndex(vote => vote.user === u.id);
                    const newVote = { 'user': u.id, 'voteHash': voteHash, 'vote': voteMap[voteHash] };
                    if (currentVoteIdx < 0) {
                        voteDetails.votes.push(newVote);
                    } else {
                        voteDetails.votes.splice(currentVoteIdx, 1, newVote);
                    }
                    voteDetails.votes.forEach(vote => votes[vote.voteHash]++);
                    VOTE_PERSISTANCE.writeFile(PollCommand.voteData);
                    const voteUpdate = `:+1: - Aye - ${votes['f09f918d']} votes in favor\n`+
                            `:no_entry_sign: - Abstain - ${votes['f09f9aab']} abstentions\n`+
                            `:-1: - Nay - ${votes['f09f918e']} votes against`;
                    embed.fields.splice(0, 1, { 'name': 'React Below to Vote:', 'value': voteUpdate });
                    r.message.edit({ embeds: [embed] });
                }
            });
        });
    }

    static reloadPolls(client) {
        this.voteData.filter(v => v.question && (new Date(v.initDate) <= new Date())).forEach(vote => {
            if (vote.voteId > voteId) voteId = vote.voteId+1;
            client.guilds.fetch(vote.guild).then(guild => {
                guild.channels.cache.get(vote.channel)
                        .messages.fetch(vote.message).then(message => {
                    this.generateCommand(vote, client).registerListener(message, vote);
                    voteId++;
                }).catch(e => {
                    this.generateCommand(vote, client).displayPoll(vote);
                    voteId++;
                });
            });
        });
    }

    static runSchedule(client) {
        return (pollData) => {
            this.generateCommand(pollData, client).displayPoll(pollData);
        }
    }

    static generateCommand(pollData, client) {
        const fakeInteraction = {
            'data': {
                'options': [{
                    'value': `poll`
                }]
            },
            'guild_id': pollData.guild,
            'channel_id': pollData.channel
        };

        return new PollCommand(fakeInteraction, client);
    }
}
