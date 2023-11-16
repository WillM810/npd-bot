'use strict';

import DISCORD from 'discord.js';
import CRYPTO from 'crypto';

import FilePersistenceEngine from '../../utils/FilePersistenceEngine.js';

import BaseCommand from '../baseCommand.js';

import DISCORD_UTILS from '../../utils/discord-utils.js';

import PERMS from '../../constants/permissions.js';
import ROLES from '../../constants/roles.js';
import CHANS from '../../constants/channels.js';

import Mailer from '../../utils/mailer.js';

const BOT_ROLES = [
    ROLES.LPD_BOT,
    ROLES.STATE_CHAIR,
    ROLES.ADMIN
];

let voteId = 0;
const VOTE_PERSISTANCE = new FilePersistenceEngine('./data/storage/ballotData');
const SELECTIONS = [ '🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮', '🇯', '🇰', '🇱', '🇲', '🇳', '🇴', '🇵', '🇶', '🇷', '🇸', '🇹', '🇺', '🇻', '🇼', '🇽', '🇾', '🇿' ];
const HASHES = [
    'f09f87a6', 'f09f87a7', 'f09f87a8', 'f09f87a9',
    'f09f87aa', 'f09f87ab', 'f09f87ac', 'f09f87ad',
    'f09f87ae', 'f09f87af', 'f09f87b0', 'f09f87b1',
    'f09f87b2', 'f09f87b3', 'f09f87b4', 'f09f87b5',
    'f09f939d', 'f09f9aab'
];
const INSTRUCTIONS = [
    `:grey_question: - Show current votes`,
    `<:whip:830972517598494740> - Whip outstanding votes`,
    `:arrows_counterclockwise: - Move poll to bottom`,
    `📨 - Close poll and publish result`,
    `:x: - Delete poll (DON'T)`
].join('\n');
const PVT_INSTRUCTIONS = '📝 - Request Ballot\n'+INSTRUCTIONS;
const PVT_APPROVAL_BALLOT_INSTRUCTIONS = [
    `🇦 - Select or remove candidates`,
    `📝 - Submit write in votes`,
    `🚫 - Clears all votes, selects NOTA`,
    `✅ - Submit ballot`,
    `:x: - Cancel ballot`,
    ``,
    `This is an approval ballot, so you may select multiple options.  Clearing your initial reaction will remove that candidate from your ballot, except `+
    `for write in votes.  In order to clear write in votes you must clear all votes by selecting the 🚫 reaction.  After using the  reaction, you will have `+
    `to clear the other reactions manually as the bot cannot do it for you in a DM Channel.  To submit multiple write in votes you must `+
    `clear and re-add the 📝 reaction.  This is a secret ballot, so your votes are not tied to your Discord user once they are submitted and cannot be changed.`
].join('\n');
const RCV_BALLOT_INSTRUCTIONS = [
    `🇦 - Select or remove candidates`,
    `📝 - Submit write in votes`,
    `🚫 - Clears all votes, selects NOTA`,
    `✅ - Submit ballot`,
    `:x: - Cancel ballot`,
    ``,
    `This is an ranked choice ballot, so you may select multiple options.  Clearing your initial reaction will remove that candidate from your ballot, except `+
    `for write in votes.  In order to clear write in votes you must clear all votes by selecting the 🚫 reaction.  To submit multiple write in votes you must `+
    `clear and re-add the 📝 reaction.  Candidates are ranked in the order they are added, so to lower the ranking of a candidate you must remove them and then `+
    `re-add them in the correct order.  This is a secret ballot, so your votes are not tied to your Discord user once they are submitted and cannot be changed.\n\n`+
    `Pay no mind to the reaction counters.  The Bot cannot reset them in a DM channel.`
].join('\n');
const PVT_RCV_BALLOT_INSTRUCTIONS = [
    `🇦 - Select or remove candidates`,
    `📝 - Submit write in votes`,
    `🚫 - Clears all votes, selects NOTA`,
    `✅ - Submit ballot`,
    `:x: - Cancel ballot`,
    ``,
    `This is an ranked choice ballot, so you may select multiple options.  Clearing your initial reaction will remove that candidate from your ballot, except `+
    `for write in votes.  In order to clear write in votes you must clear all votes by selecting the 🚫 reaction.  To submit multiple write in votes you must `+
    `clear and re-add the 📝 reaction.  Candidates are ranked in the order they are added, so to lower the ranking of a candidate you must remove them and then `+
    `re-add them in the correct order.  This is a secret ballot, so your votes are not tied to your Discord user once they are submitted and cannot be changed.\n\n`+
    `Pay no mind to the reaction counters.  The Bot cannot reset them in a DM channel.`
].join('\n');

export default class BallotCommand extends BaseCommand {
    static voteData = VOTE_PERSISTANCE.readFile().filter(v => !v.question);

    static generateEmbed(position, candidates, isSecret, isApproval, doneDate, url) {
        const type = [];
        if (!isSecret) type.push('NOT SECRET');
        if (isApproval) type.push('APPROVAL');
        const privateBallot = (isSecret && isApproval)

        const candidateFields = [{ 'name': 'Candidates:', 'value': candidates, 'inline': !isSecret }];
        if (!isSecret) candidateFields.push({ 'name': 'Votes:', 'value': new Array(candidates.split('\n').length).fill(0).join('\n'), 'inline': true });
        const instructions = privateBallot?PVT_INSTRUCTIONS:INSTRUCTIONS;
        return new DISCORD.MessageEmbed()
                .setTitle(`Vote for ${position}:${type.length?`\n*(${type.join('/')})*`:''}`)
                .setDescription(this.getDescriptionText(url, doneDate))
                .addFields(candidateFields)
                .addField('Instructions:', ((isApproval && !isSecret)?'🚫 - Clears all votes, selects NOTA\n':'')+instructions);
    }

    static getDescriptionText(url, doneDate) {
        const dateText = [ `Closes ${doneDate.toLocaleDateString()}`,
                `${doneDate.toLocaleTimeString(undefined, { 'timeZoneName': 'short' })}` ].join(' @ ');
        
        return (url?`${url.trim().substr(4)}\n`:``)+dateText;
    }

    static getChannelVoterRoles(channel, roles) {
        return roles.filter(r => {
            if (!BOT_ROLES.includes(r.id) && (channel.parent.id !== CHANS.EXEC_SESSION_CAT || r.id === ROLES.STATE_BOARD)) {
                const bitfield = BigInt(channel.permissionsFor(r.id).bitfield);
                return ((BigInt(bitfield) & PERMS.REQD_VOTE_PERMS) === PERMS.REQD_VOTE_PERMS);
            } else return false;
        });
    }

    execute(params) {
        if (params[14]) return this.listPolls(params[14]);
        if (params[15]) return this.cancelPoll(params[15]);

        // if (params[10] !== 'false' && (params[12] === 'true')) return this.ephemeral(`<@!816085452091424799> does not currently support secret approval voting.`)

        const initDate = this.getInitDate(params);
        if (isNaN(initDate)) return;
        const doneDate = new Date(initDate.getTime()+(48*60*60*1000));
        
        const candidateParts = params[13].split('/');
        const position = candidateParts.shift();
        const candidates = candidateParts.map((c, idx) => `${SELECTIONS[idx]} - ${c}`).join('\n')+`\n📝 - Write In\n🚫 - None of the Above`;
        if (candidateParts.length > 16) return ephemeral(`<@!816085452091424799> only supports up to 16 options.`);

        const embed = BallotCommand.generateEmbed(position, candidates, params[10] !== 'false', params[12] === 'true', doneDate, params[6]);

        const filteredRoles = BallotCommand.getChannelVoterRoles(this.channel, this.roles);
        if (!filteredRoles.filter(role => this.roles.has(role))) return this.ephemeral('No permission in this channel.');
        const roleMentions = filteredRoles.map(role => `<@&${role.id}>`).join(', ');

        this.ack();
        this.guild.members.fetch().then(members => {
            const eligibleRoles = new DISCORD.Collection(filteredRoles.map(r => [r.id, null]));
            const eligibleIds = members.filter(i => i.roles.cache.intersect(eligibleRoles).size).map(i => i.id);
            embed.setDescription(embed.description+`\n(0/${eligibleIds.length}) eligible votes.`);

            const voteDetails = {
                'voteId': voteId++,
                'position': `${params[6] || ''} ${position}`.trim(),
                'candidates': candidateParts,
                'secret': params[10] !== 'false',
                'approval': params[12] === 'true',
                'initDate': initDate,
                'doneDate': doneDate,
                'roles': filteredRoles.map(r => r.id),
                'guild': this.guild.id,
                'channel': this.channel.id,
                'message': '-1',
                'votes': [],
                'voters': []
            };
            BallotCommand.voteData.push(voteDetails);

            if (new Date(voteDetails.initDate) <= new Date()) {
                this.complete();
                this.channel.send(`Ballot for ${roleMentions}`, embed).then(message => {
                    this.supportBallot(message, voteDetails);
                });
            } else {
                VOTE_PERSISTANCE.writeFile(BallotCommand.voteData);
                this.complete(`Ballot ${voteId-1} scheduled for ${initDate.toLocaleString()}`);
            }
        });
    }

    listPolls(polls) {
        if (polls === '*') {
            if (BallotCommand.voteData.filter(v => v.message === '-1' && !v.question).length === 0) return this.ephemeral('No scheduled polls.');
            const pollList = BallotCommand.voteData.filter(v => v.message === '-1')
                    .map(v => `${v.voteId} - ${v.position.replace(/url:(\[.+\])\(.+\) +(.+)/, '$2 $1')}: ${new Date(v.initDate).toLocaleString()}`)
                    .join('\n');
            return this.ephemeral(pollList);
        } else if (!isNaN(polls)) {
            const pollData = BallotCommand.voteData.find(v => v.message === '-1' && !v.question && v.voteId === Number(polls));
            if (!pollData) return this.ephemeral(`Poll ${polls} not found.`);
            const pollMsg = `${pollData.voteId} - ${pollData.position.replace(/url:(\[.+\])\(.+\) +(.+)/, '$2 $1')}: `+
                    `${new Date(pollData.initDate).toLocaleString()}\n<#${pollData.channel}> ${pollData.roles.map(r => `<@&${r}>`)}`
            return this.ephemeral(pollMsg);
        } else return this.ephemeral(`Invalid poll id: ${polls}`);
    }

    cancelPoll(poll) {
        if (!isNaN(poll)) {
            const pollIndex = BallotCommand.voteData.findIndex(v => v.voteId === Number(poll) && v.message === '-1');
            if (pollIndex === -1) return this.ephemeral(`Poll ${poll} not found.`);
            BallotCommand.voteData.splice(pollIndex, 1);
            VOTE_PERSISTANCE.writeFile(BallotCommand.voteData);
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
        if (params[5] && params[5] === 'p') params[3] = (Number(params[3])+12).toString();
        if (params[5] && params[5] === 'a' && params[3] === '12') params[3] = '00';
        params[1] = new Date(`${params[2].toDateString()} ${params[3]}:${params[4] || '00'}`);
        if (params[1] < new Date()) params[1].setDate(params[1].getDate()+1);
        if (params[1] < new Date()) return ephemeral(`Date has passed: ${params[1].toLocaleString()}`);

        return new Date(params[1]);
    }

    registerListener(message, voteDetails) {
        const guild = this.client.guilds.cache.get(voteDetails.guild);
        const channel = guild.channels.cache.get(voteDetails.channel);

        guild.members.fetch().then(members => {
            message.createReactionCollector(() => true, {}).on('collect', (r, u) => {
                if (u.bot) return;
                const voteHash = Buffer.from(r.emoji.toString()).toString('hex');
                if (voteHash !== 'f09f9484') r.users.remove(u).catch();
                const votes = {
                    'f09f87a6': 0, 'f09f87a7': 0, 'f09f87a8': 0, 'f09f87a9': 0,
                    'f09f87aa': 0, 'f09f87ab': 0, 'f09f87ac': 0, 'f09f87ad': 0,
                    'f09f87ae': 0, 'f09f87af': 0, 'f09f87b0': 0, 'f09f87b1': 0,
                    'f09f87b2': 0, 'f09f87b3': 0, 'f09f87b4': 0, 'f09f87b5': 0,
                    'f09f939d': 0, 'f09f9aab': 0
                };

                const eligibleIds = members.filter(i => i.roles.cache.reduce((p, r) => p || voteDetails.roles.includes(r.id), false)).map(m => m.id);
                if (!eligibleIds.includes(u.id) && u.id !== guild.ownerID && voteHash !== 'e29d94') return;

                const now = new Date();
                const closingTime = new Date(voteDetails.doneDate);
                
                if ((voteHash === 'e29d8c' || voteHash === 'f09f93a8') || now > closingTime) {
                    if ((u.id !== guild.ownerID && !members.get(u.id).roles.cache.has(ROLES.STATE_CHAIR)) && now <= closingTime) return;
                    voteDetails.votes.forEach(vote => vote.candidate?votes[vote.voteHash]++:0);

                    const totalVotes = voteDetails.approval?voteDetails.voters.length:voteDetails.votes.filter(v => v.candidate).length;
                    const validVotes = Object.keys(votes).filter((v, idx) => voteDetails.candidates[idx]);

                    const writeInArray = voteDetails.votes.filter(v => v.voteHash === 'f09f939d').map(v => v.candidate);
                    const writeInTally = {};
                    writeInArray.forEach(v => {
                        if (!writeInTally[v]) writeInTally[v] = 1;
                        else writeInTally[v]++;
                    });

                    const writeInResult = Object.keys(writeInTally).map(c => `  ${c} - ${writeInTally[c]}`).join('\n');
                    const writeInPercent = Object.keys(writeInTally).map(c => `  (${((writeInTally[c]/totalVotes)*100).toFixed(2)}%)`).join('\n');

                    const tallies = validVotes.map((v, idx) => `${voteDetails.candidates[idx]} - ${votes[v]}`).join('\n')
                            + `\nNone of the Above - ${votes['f09f9aab']}`
                            + `\n__**Write In - ${votes['f09f939d']}${votes['f09f939d']?':':''}**__\n${writeInResult}`;

                    const percentages = validVotes.map(v => `(${((votes[v]/totalVotes)*100).toFixed(2)}%)`).join('\n')
                            + `\n(${((votes['f09f9aab']/totalVotes)*100).toFixed(2)}%)`
                            + `\n${voteDetails.approval?'':'('+((votes['f09f939d']/totalVotes)*100).toFixed(2)+'%)'}`
                            + `\n${writeInPercent}`;

                    const voteInfo = voteDetails.secret?null:voteDetails.votes.filter(v => v.candidate)
                            .map(v => `${members.get(v.user).nickname || members.get(v.user).user.username} - ${v.candidate}`).join('\n');

                    const findUrl = voteDetails.position.match(/(url:\[.+\]\(.+\)) (.+)/) || [, , voteDetails.position];
                    const results = new DISCORD.MessageEmbed();
                    embed.title = `Balloting for ${findUrl[2]} complete.`;
                    embed.description = (findUrl[1]?`${findUrl[1].substr(4)}\n`:``)+`Total Votes: ${totalVotes}\n`;
                    embed.fields.push({ name: 'Tally:', value: tallies, inline: true })
                    embed.fields.push({ name: 'Percentage:', value: percentages, inline: true });
                    if (!voteDetails.secret) results.fields.push({ name: 'Votes:', value: voteInfo || 'No votes received.' });

                    BallotCommand.voteData.splice(BallotCommand.voteData.findIndex(v => v.voteId === voteDetails.voteId), 1);
                    VOTE_PERSISTANCE.writeFile(BallotCommand.voteData);

                    r.message.delete({ 'timeout': 1000 }).catch(console.log);
                    channel.send(results).catch(console.log);
                    if (voteHash !== 'e29d8c') {
                        const roleNames = guild.roles.cache.filter(r => voteDetails.roles.includes(r.id)).map(r => r.name).join('/');
                        const urlParts = results.description && results.description.match(/\[(.*)\]\((.*)\)/);
                        const body = `<h3>${results.title}</h3>${urlParts?`<a href="${urlParts[2]}">${urlParts[1]}</a><br/>`:``}`+
                                `Total Votes: ${totalVotes}<h4>${results.fields[0].name}</h4>`+
                                `${results.fields[0].value.replace(/\n/g, '<br/>').replace(/__\*\*(.*)\*\*__/, '<u><strong>$1</strong></u>')}`;
                        Mailer.sendPollResult(`[${roleNames} Ballot] - ${results.title}`, body);
                    }
                } else if (voteHash === '3c3a776869703a3833303937323531373539383439343734303e') {
                    const awaitingMsg = eligibleIds.filter(u => !voteDetails.voters.includes(u))
                            .map(u => `<@!${u}>`).join(', ') + ', your votes are pending.';
                    DISCORD_UTILS.replyToMessage(this.client, r.message.id, { 'content': awaitingMsg }, voteDetails.channel).then(msg => {
                        channel.messages.fetch(msg.id).then(m => m.delete({ 'timeout': 20000 }));
                    });
                } else if (voteHash === 'e29d94') {
                    const awaitingMsg = eligibleIds.filter(u => !voteDetails.voters.includes(u))
                            .map(u => `${members.get(u).nickname || members.get(u).user.username}`).join('\n');
                    const voteInfo = voteDetails.secret?null:voteDetails.votes.filter(v => v.candidate)
                            .map(v => `${members.get(v.user).nickname || members.get(v.user).user.username} - ${v.candidate}`).join('\n');
                    const findUrl = voteDetails.position.match(/(url:\[.+\]\(.+\)) (.+)/) || [, , voteDetails.position];
                    const awaitingEmbed = new DISCORD.MessageEmbed();
                    awaitingEmbed.title = `Balloting for ${findUrl[2]}:`;
                    awaitingEmbed.description = `${(findUrl[1] || ``).substr(4)}\nAs of ${new Date().toLocaleString()}`;
                    awaitingEmbed.fields.push({ name: 'Awaiting Votes from:', value: awaitingMsg || 'none' });
                    if (!voteDetails.secret) awaitingEmbed.fields.push({ name: 'Votes:',  value: voteInfo || 'No votes received.' });
                    if (!eligibleIds.includes(u.id)) u.createDM().then(channel => {
                        channel.send({ embeds: [awaitingEmbed] });
                    });
                    else DISCORD_UTILS.replyToMessage(this.client, r.message.id, { 'embed': awaitingEmbed }, voteDetails.channel).then(msg => {
                        channel.messages.fetch(msg.id).then(m => m.delete({ 'timeout': 20000 }));
                    });
                } else if (voteHash === 'f09f9484') {
                    channel.messages.fetch({ 'limit': 1}).then(m => {
                        if (!m.has(voteDetails.message))
                            this.displayBallot(voteDetails);
                    });
                } else {
                    let removeFlag = false;
                    if (voteDetails.voters.includes(u.id) && voteDetails.secret && !voteDetails.approval) return;
                    if (voteDetails.voters.includes(u.id) && !voteDetails.secret && !voteDetails.approval) {
                        voteDetails.voters.splice(voteDetails.voters.findIndex(v => v === u.id), 1);
                        voteDetails.votes.splice(voteDetails.votes.findIndex(v => v.user === u.id), 1);
                    }
                    if (!voteDetails.secret && voteDetails.approval) {
                        if (voteHash === 'f09f9aab') {
                            voteDetails.votes = voteDetails.votes.filter(v => v.user !== u.id);
                            voteDetails.voters = voteDetails.voters.filter(v => v !== u.id);
                        }
                        if (voteHash !== 'f09f939d') {
                            const voterSelections = voteDetails.votes.filter(v => v.user === u.id);
                            const removeVote = voteDetails.votes.findIndex(v => v.user === u.id && v.voteHash === voteHash);
                            if (removeVote >= 0) {
                                removeFlag = true;
                                voteDetails.votes.splice(removeVote, 1);
                                if (voterSelections.length === 1) voteDetails.voters = voteDetails.voters.filter(v => v !== u.id);
                            }
                        }
                        if (voteHash !== 'f09f9aab') {
                            voteDetails.votes = voteDetails.votes.filter(v => (v.user === u.id && v.voteHash !== 'f09f9aab') || v.user !== u.id);
                        }
                    }
                    const privateBallot = voteDetails.approval && voteDetails.secret;
                    if (!removeFlag && (!voteDetails.approval || !voteDetails.voters.includes(u.id)) && !privateBallot) voteDetails.voters.push(u.id);

                    const embedUpdate = new DISCORD.MessageEmbed(message.embeds[0]);
                    const vote = { 'voteHash': voteHash };
                    vote['candidate'] = voteDetails.candidates.filter((c, idx) => Object.keys(votes)[idx] === voteHash)[0];
                    if (!voteDetails.secret) vote['user'] = u.id;

                    if (voteHash === 'f09f939d' && !(voteDetails.secret && voteDetails.approval)) {
                        vote['key'] = voteDetails.voteId+':'+CRYPTO.randomBytes(4).toString('hex');
                        u.createDM().then(channel => {
                            channel.send(`You have selected the "Write In" option on the ballot for ${voteDetails.position}.  You `+
                                    `have been assigned a vote key of **WIV${vote['key']}**.\n\nPlease reply with your selection `+
                                    `using the following syntax to ensure your vote is tabulated correctly:\n\`WIV${vote['key']}: Jamie Doe\`\n\n`+
                                    `To cancel your write in ballot use:\n\`WIV${vote['key']}: CANCEL\``);
                        });
                    } else if (voteHash === 'f09f939d' && (voteDetails.secret && voteDetails.approval) && !voteDetails.voters.includes(u.id)) {
                        u.createDM().then(channel => {
                            channel.send(this.createPrivateBallot(voteDetails)).then(ballotMsg => {
                                this.supportPrivateBallot(ballotMsg, voteDetails);
                            });
                        });
                    } else if (voteHash === 'f09f9aab') {
                        vote['candidate'] = 'None of the Above';
                    }
                    if (!removeFlag && !(voteDetails.secret && voteDetails.approval)) voteDetails.votes.push(vote);

                    if (!voteDetails.secret) {
                        voteDetails.votes.forEach(vote => vote.candidate?votes[vote.voteHash]++:0);
                        const currentTally = [
                            voteDetails.candidates.map((c, idx) => Object.values(votes)[idx]).join('\n'),
                            [ votes['f09f939d'], votes['f09f9aab'] ].join('\n')
                        ].join('\n');
                        embedUpdate.fields.splice(1, 1, { 'name': 'Votes:', 'value': currentTally, 'inline': true })
                    }

                    VOTE_PERSISTANCE.writeFile(BallotCommand.voteData);
                    const description = embedUpdate.description.split('\n');
                    description[description.length-1] = `(${[...new Set(voteDetails.votes.filter(v => v.candidate).map(v => v.user))].length}/${eligibleIds.length}) eligible votes.`
                    embedUpdate.description = description.join('\n');
                    r.message.edit({ embeds: [embedUpdate] }).catch(console.log);
                }
            });
        });
    }

    displayBallot(voteDetails, reload = false, force = false) {
        this.client.guilds.fetch(voteDetails.guild).then(guild => {
            const channel = guild.channels.cache.get(voteDetails.channel);
            if (channel.lastMessageID === voteDetails.message && !force) return;

            this.guild.members.fetch().then(members => {
                const roleMentions = 'Ballot for '+voteDetails.roles.map(r => `<@&${r}>`).join(', ');
                const candidates = voteDetails.candidates.map((candidate, idx) => `${SELECTIONS[idx]} - ${candidate}`).join('\n')
                        +`\n📝 - Write In\n🚫 - None of the Above`;;

                const eligibleRoles = new DISCORD.Collection(voteDetails.roles.map(r => [r, null]));
                const eligibleIds = members.filter(i => i.roles.cache.intersect(eligibleRoles).size).map(i => i.id);

                channel.messages.fetch(voteDetails.message).then(message => {
                    if (channel.lastMessageID === message.id && !force) return;
                    if (reload === true) return this.supportBallot(message, voteDetails, true);
                    const embed = new DISCORD.MessageEmbed(message.embeds[0]);
                    embed.setDescription(embed.description.split('\n')[0]+
                            `\n(${voteDetails.approval?voteDetails.voters.length:voteDetails.votes.filter(v => v.candidate).length}/${eligibleIds.length}) eligible votes.`);

                    message.delete().catch(console.error);
                    channel.send(message.content, embed).then(freshMsg => {
                        this.supportBallot(freshMsg, voteDetails);
                    });
                }, e => {
                    const findUrl = voteDetails.position.match(/(url:\[.+\]\(.+\)) (.+)/) || [, , voteDetails.position];
                    const embed = BallotCommand.generateEmbed(findUrl[2],
                            candidates,
                            voteDetails.secret,
                            voteDetails.approval,
                            new Date(voteDetails.doneDate),
                            findUrl[1]);
                    embed.setDescription(embed.description+`\n(${voteDetails.votes.filter(v => v.candidate).length}/${eligibleIds.length}) eligible votes.`);
                    
                    channel.send(roleMentions, embed).then(freshMsg => {
                        this.supportBallot(freshMsg, voteDetails);
                    });
                });
            });
        });
    }

    supportBallot(freshMsg, voteDetails, pin) {
        voteDetails.message = freshMsg.id;
        VOTE_PERSISTANCE.writeFile(BallotCommand.voteData);

        const privateBallot = voteDetails.secret && (voteDetails.approval);
        
        if (!privateBallot) for (let idx=0; idx<voteDetails.candidates.length; idx++) freshMsg.react(SELECTIONS[idx]).catch();
        freshMsg.react('📝').catch();
        if (!privateBallot) freshMsg.react('🚫').catch();
        freshMsg.react('❔').catch();
        freshMsg.react(':whip:830972517598494740').catch();
        freshMsg.react('🔄').catch();
        freshMsg.react('📨').catch();
        freshMsg.react('❌').catch();
        
        if (pin) return this.registerListener(freshMsg, voteDetails);
        freshMsg.pin().then(pinMsg => {
            pinMsg.channel.messages.fetch().then(msgs => {
                (msgs.find(m => m.system) || { 'delete': () => {} }).delete().catch();
    
                this.registerListener(freshMsg, voteDetails);
            });
        });
    }

    createPrivateBallot(voteDetails) {
        const findUrl = voteDetails.position.match(/(url:\[.+\]\(.+\)) (.+)/) || [, , voteDetails.position];
        const doneDate = new Date(voteDetails.doneDate);
        const closeString = [
            `Closes ${doneDate.toLocaleDateString()}`,
            `${doneDate.toLocaleTimeString(undefined, { 'timeZoneName': 'short' })}`
        ].join(' @ ');
        const candidates = voteDetails.candidates.map((candidate, idx) => `${SELECTIONS[idx]} - ${candidate}`).join('\n')
                +`\n📝 - Write In\n🚫 - None of the Above`;
        return new DISCORD.MessageEmbed()
                .setTitle(`Secret ${'approval'} ballot for: ${findUrl[2]}`)
                .setDescription(`${(findUrl[1] || '').substr(4)}\n${closeString}`.trim())
                .addField('Candidates:', candidates)
                .addField('Instructions:', PVT_APPROVAL_BALLOT_INSTRUCTIONS);
    }

    supportPrivateBallot(ballotMsg, voteDetails) {
        for (let idx=0; idx<voteDetails.candidates.length; idx++) ballotMsg.react(SELECTIONS[idx]);
        ballotMsg.react('📝');
        ballotMsg.react('🚫');
        ballotMsg.react('✅');
        ballotMsg.react('❌');

        if (!voteDetails.ballots) voteDetails.ballots = [];
        const invalidatedBallot = voteDetails.ballots.find(b => b.user === ballotMsg.channel.recipient.id);
        if (invalidatedBallot) invalidatedBallot.message = ballotMsg.id;
        else voteDetails.ballots.push({ 'user': ballotMsg.channel.recipient.id, 'message': ballotMsg.id });
        VOTE_PERSISTANCE.writeFile(BallotCommand.voteData);

        this.connectBallot(ballotMsg, voteDetails);
    }

    connectBallot(ballotMsg, voteDetails) {
        ballotMsg.createReactionCollector(() => true, { 'dispose': true })
                .on('collect', this.handlePvtBallotReact('collect', ballotMsg, voteDetails))
                .on('remove', this.handlePvtBallotReact('remove', ballotMsg, voteDetails));
    }

    handlePvtBallotReact(event, ballotMsg, voteDetails) {
        const votes = [];
        return (r, u) => {
            if (u.bot) return;
            const hash = Buffer.from(r.emoji.toString()).toString('hex');
            const vote = { 'voteHash': hash };
            votes.push(vote);
            console.log(votes)
            if (hash === 'e29d8c') {
                while (votes.length) {
                    const r = votes.pop();
                    if (r.voteHash === 'f09f939d') voteDetails.votes.splice(voteDetails.votes.findIndex(v => v === r), 1);
                }
                voteDetails.ballots = voteDetails.ballots.filter(b => b.user !== ballotMsg.channel.recipient.id && b.message !== ballotMsg.id);
                ballotMsg.delete({ 'timeout': 1000 });
                ballotMsg.channel.send(`Ballot canceled.  You may request another one.`);
                VOTE_PERSISTANCE.writeFile(BallotCommand.voteData);
            } else if (hash === 'e29c85') {
                console.log(111,votes);
                votes.pop();
                console.log(222,votes);
                ballotMsg.delete({ 'timeout': 1000 });
                ballotMsg.channel.send(`Ballot submitted for:\n${votes.map(v => v.candidate).join('\n')}`)
                this.submitBallot(ballotMsg, voteDetails, votes, u.id);
            } else if (hash === 'f09f9aab' && event === 'collect') {
                while(votes.length) {
                    const clearVote = votes.pop();
                    voteDetails.votes.splice(voteDetails.votes.findIndex(v => v === clearVote), 1);
                }
                const embed = new DISCORD.MessageEmbed(ballotMsg.embeds[0]);
                embed.fields[0].value = voteDetails.candidates.map((candidate, idx) => `${SELECTIONS[idx]} - ${candidate}`).join('\n')
                        +`\n📝 - Write In\n🚫 - **None of the Above**`;
                ballotMsg.edit(embed);
            } else if (hash === 'f09f939d') {
                if (event === 'collect') {
                    vote['key'] = voteDetails.voteId+':'+CRYPTO.randomBytes(4).toString('hex');
                    u.createDM().then(channel => {
                        channel.send(`You have selected the "Write In" option on the ballot for ${voteDetails.position}.  You `+
                                `have been assigned a vote key of **WIV${vote['key']}**.\n\nPlease reply with your selection `+
                                `using the following syntax to ensure your vote is tabulated correctly:\n\`WIV${vote['key']}: Jamie Doe\`\n\n`+
                                `To cancel your write in ballot use:\n\`WIV${vote['key']}: CANCEL\``);
                    });
                    voteDetails.votes.push(vote);
                    VOTE_PERSISTANCE.writeFile(BallotCommand.voteData);
                    console.log(voteDetails, votes);
                }
            } else {
                const embed = new DISCORD.MessageEmbed(ballotMsg.embeds[0]);
                const candidates = embed.fields[0].value.split('\n');
                console.log(hash)
                const candidateIndex = hash === 'f09f9aab'?candidates.length-1:HASHES.findIndex(h => h === hash);
                const approvedCandidate = `${SELECTIONS[candidateIndex]} - **${voteDetails.candidates[candidateIndex]}**`;
                console.log(candidates, candidateIndex);
                if (candidates[candidateIndex] !== approvedCandidate && r.count > 1) {
                    candidates[candidateIndex] = approvedCandidate;
                    vote['candidate'] = voteDetails.candidates[candidateIndex];
                } else {
                    candidates[candidateIndex] = candidates[candidateIndex].replace(/\*/g, '');
                    votes.splice(votes.findIndex(v => v.voteHash === hash), 1);
                }
                console.log(votes);
                if (event === 'collect') candidates[candidates.length-1] = candidates[candidates.length-1].replace(/\*/g, '');
                embed.fields[0].value = candidates.join('\n');
                ballotMsg.edit(embed);
            }
        }
    }

    submitBallot(ballotMsg, voteDetails, votes, userId) {
        console.log(voteDetails, ballotMsg.id, votes);
        votes = votes.filter(v => v.voteHash !== 'f09f939d');
        voteDetails.votes = voteDetails.votes.concat(votes);
        voteDetails.voters.push(userId);
        voteDetails.ballots = voteDetails.ballots.filter(b => b.user !== userId && b.message !== ballotMsg.id);
        this.displayBallot(voteDetails, false, true);
        VOTE_PERSISTANCE.writeFile(BallotCommand.voteData);
        console.log(voteDetails, ballotMsg.id, votes);
    }

    static reloadBallots(client) {
        this.voteData.filter(v => !v.question && (new Date(v.initDate) <= new Date())).forEach(vote => {
            if (vote.voteId > voteId) voteId = vote.voteId+1;
            client.guilds.fetch(vote.guild).then(guild => {
                guild.channels.cache.get(vote.channel)
                        .messages.fetch(vote.message).then(message => {
                    const cmd = this.generateCommand(vote, client);
                    cmd.displayBallot(vote, true);
                    if (vote.ballots) vote.ballots.forEach(b => {
                        guild.members.fetch(b.user).then(member => {
                            member.createDM().then(dm => {
                                dm.messages.fetch(b.message).then(ballot => {
                                    cmd.connectBallot(ballot, vote);
                                });
                            });
                        });
                    });
                    voteId++;
                }).catch(e => {
                    this.generateCommand(vote, client).displayBallot(vote)
                    voteId++;
                });
            });
        });
    }

    static runSchedule(client) {
        return (ballotData) => {
            this.generateCommand(ballotData, client).displayBallot(ballotData);
        }
    }

    static generateCommand(ballotData, client) {
        const fakeInteraction = {
            'data': {
                'options': [{
                    'value': 'ballot'
                }]
            },
            'guild_id': ballotData.guild,
            'channel_id': ballotData.channel
        };

        return new BallotCommand(fakeInteraction, client);
    }

    static generateWriteInHandler(client) {
        return {
            'handleMessage': (message) => {
                const voteMsg = message.content.match(/WIV((\d+):.+): (.+)/);
                if (voteMsg) return this.processWriteInVote(message, voteMsg, client);
            }
        }
    }

    static processWriteInVote(message, voteMsg, client) {
        const vote = BallotCommand.voteData.filter(v => v.voteId.toString() === voteMsg[2])[0];
        if (vote) {
            if (vote.votes.find(v => v.user === message.author.id && v.candidate === voteMsg[3]))
                return (`You have already submitted a write in vote for ${voteMsg[3]}.  You `+
                        `cannot submit two for the same candidate.`);
            const wiv = vote.votes.filter(v => v.key === voteMsg[1])[0];
            if (wiv) {
                if (voteMsg[3] === 'CANCEL') {
                    vote.votes = vote.votes.filter(v => v !== wiv);
                    vote.voters = vote.voters.filter(v => v !== message.author.id);
                    return `Your write in ballot has been cancelled and your ballot can be reissued.`
                }
                delete wiv.key;
                wiv.candidate = voteMsg[3];
                if (vote.candidates.includes(voteMsg[3]))
                    wiv.voteHash = HASHES[vote.candidates.findIndex(c => c === voteMsg[3])];

                VOTE_PERSISTANCE.writeFile(BallotCommand.voteData);
                client.channels.fetch(vote.channel).then(channel => {
                    channel.messages.fetch(vote.message).then(ballotMessage => {
                        const embedUpdate = new DISCORD.MessageEmbed(ballotMessage.embeds[0]);
                        const desc = embedUpdate.description.split('\n');
                        const tally = desc[desc.length-1].match(/^\((\d+)\/(.+)\) eligible votes.$/);
                        if (vote.votes.filter(v => v.user === message.author.id).length === 1 || vote.approval === false)
                            desc[desc.length-1] = `(${Number(tally[1])+1}/${tally[2]}) eligible votes.`;
                        embedUpdate.setDescription(desc.join('\n'));
                        if (!vote.secret) {
                            const candidateIndex = vote.candidates.findIndex(c => c === voteMsg[3]);
                            embedUpdate.fields[1].value = embedUpdate.fields[1].value.split('\n')
                                    .map((t, idx, v) => idx === (candidateIndex > -1?candidateIndex:(v.length-2))?Number(t)+1:t).join('\n');
                        }
                        if (vote.secret && vote.approval) {
                            const ballot = vote.ballots.find(b => b.user === message.author.id);
                            message.channel.messages.fetch(ballot.message).then(message => {
                                const embed = message.embeds[0];
                                const candidates = embed.fields[0].value.split('\n')
                                candidates[candidates.length-2] += `\n**------${voteMsg[3]}**`;
                                candidates[candidates.length-1] = candidates[candidates.length-1].replace(/\*/g, '');
                                embed.fields[0].value = [...new Set(candidates.join('\n').split('\n'))].join('\n');
                                message.edit(embed);
                            }).catch(console.error);
                        } else ballotMessage.edit(embedUpdate);
                    });
                });
                return (`Your vote has been recorded.`+(vote.secret?`  No data has been saved linking `+
                        `your user information to your selection.`:``));
            } else return (`You sent me a vote, but I could not match the write in key.`);
        } else return (`You sent me a vote, but I couldn't find the ballot.`);
    }
}
