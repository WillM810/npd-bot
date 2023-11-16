'use strict';

import DISCORD, { Intents } from 'discord.js';

import DISCORD_UTILS from './utils/discord-utils.js';
import Mailer from './utils/mailer.js';

import COMMAND_MAPPER from './command-controller/commandMapper.js';

import CREDS from './constants/creds.js';
import ROLES from './constants/roles.js';
import CHANS from './constants/channels.js';

import TaxationResponder from './message-controller/taxation.js';
import LoveResponder from './message-controller/love.js';
import HypnoToadResponder from './message-controller/hypnotoad.js';
import RealLibertarianResponder from './message-controller/libertarian.js';
import DonateResponder from './message-controller/donate.js';
import Reactor from './message-controller/reactor.js';
import MessagePinner from './message-controller/pin.js';
import RPSHandler from './message-controller/rps.js';

import ConventionTracker from './custom-events/convention-tracker.js';
import TwitterSubmissionResponder from './message-controller/twitter.js';
import FacebookSubmissionResponder from './message-controller/facebook.js';
import MailHandler from './message-controller/mailer.js';
import LegLookup from './message-controller/legLookup.js';
import DebugCommand from './command-controller/commands/debug.js';
import MeetingsCommand from './command-controller/commands/meetings.js';
import MotionHandler from './message-controller/motion.js';
import LegCommand from './command-controller/commands/leg.js';

const BaseCommand = COMMAND_MAPPER['npd']['ping']['class'];
// const RulesCommand = COMMAND_MAPPER['npd']['rules']['class'];
const SeenCommand = COMMAND_MAPPER['npd']['seen']['class'];
const QuorumCommand = COMMAND_MAPPER['npd']['quorum']['class'];
const PollCommand = COMMAND_MAPPER['npd']['poll']['class'];
const BallotCommand = COMMAND_MAPPER['npd']['ballot']['class'];

const INTENTS = Intents.FLAGS.DIRECT_MESSAGES |
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS |
        Intents.FLAGS.DIRECT_MESSAGE_TYPING |
        Intents.FLAGS.GUILDS |
        Intents.FLAGS.GUILD_BANS |
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS |
        Intents.FLAGS.GUILD_INTEGRATIONS |
        Intents.FLAGS.GUILD_INVITES |
        Intents.FLAGS.GUILD_MEMBERS |
        Intents.FLAGS.GUILD_MESSAGES |
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS |
        Intents.FLAGS.GUILD_MESSAGE_TYPING |
        Intents.FLAGS.GUILD_PRESENCES |
        Intents.FLAGS.GUILD_VOICE_STATES |
        Intents.FLAGS.GUILD_WEBHOOKS;

const CLIENT = new DISCORD.Client({ intents: [ INTENTS ]});

const MESSAGE_HANDLERS = [];
const DM_HANDLERS = [];

CLIENT.on('messageCreate', message => {
    try {
        if (message.author.bot) return;

        if (message.channel.type === 'dm') {
            const dmResponses = DM_HANDLERS.map(handler => handler.handleMessage(message));
            const dmResponse = dmResponses.filter(r => r).join('\n').trim() || `I don't understand.`;
            message.channel.send(dmResponse);
            return;
        }

        const messages = MESSAGE_HANDLERS.map(handler => handler.handleMessage(message));
        const channel = CLIENT.api.channels(message.channel.id);

        messages.reduce((p, msg, idx, a) => {
            if (!msg) return Promise.resolve();
            if (idx === 0) {
                if (!msg.msg) return Promise.resolve(msg.cb(null));
                return channel.messages.post(msg.msg).then(msg.cb);
            } else {
                if (!msg.msg) return Promise.resolve(msg.cb(null));
                else return message.channel.send(msg.msg.data.content, msg.msg.data.embed).then(msg.cb);
            }
        }, Promise.resolve());
    } catch (e) { console.error(e); }
});

CLIENT.on('guildMemberAdd', member => {
    try {
        member.roles.add('815636524296962089');
    } catch (e) { console.error(e); }
    // member.createDM().then(channel => {
    //     channel.send(`Please accept the rules in the <#${CHANS.RULES_CHAN}> channel by petting the :hedgehog: to access the rest of the NPD Discord Server.`);
    // });
});

CLIENT.ws.on('INTERACTION_CREATE', async interaction => {
    try {
        if (interaction.data.name !== 'npd') return;
        console.log(interaction.data.options[0].value);
        BaseCommand.runCommand(interaction, CLIENT);
    } catch (e) { console.error(e); }
});

// CLIENT.on('voiceStateUpdate', ConventionTracker.updateRole);

CLIENT.once('ready', () => {
    DISCORD_UTILS.PresenceTracker.init(CLIENT);
    SeenCommand.registerTracker(CLIENT);
    QuorumCommand.registerTracker(CLIENT);
    QuorumCommand.reloadManualTrackers(CLIENT);
    PollCommand.reloadPolls(CLIENT);
    BallotCommand.reloadBallots(CLIENT);
    // FacebookSubmissionResponder.reconnect(CLIENT);

    MESSAGE_HANDLERS.push(SeenCommand);
    MESSAGE_HANDLERS.push(LegLookup.setClient(CLIENT));
    MESSAGE_HANDLERS.push(LegCommand.setClient(CLIENT));
    // MESSAGE_HANDLERS.push(TaxationResponder);
    // MESSAGE_HANDLERS.push(LoveResponder);
    // MESSAGE_HANDLERS.push(HypnoToadResponder);
    // MESSAGE_HANDLERS.push(RealLibertarianResponder);
    // MESSAGE_HANDLERS.push(DonateResponder);
    // MESSAGE_HANDLERS.push(TwitterSubmissionResponder);
    // MESSAGE_HANDLERS.push(FacebookSubmissionResponder);
    // MESSAGE_HANDLERS.push(new Reactor(CLIENT));
    // MESSAGE_HANDLERS.push(ConventionTracker);
    // MESSAGE_HANDLERS.push(MessagePinner);
    // MESSAGE_HANDLERS.push(RPSHandler);
    // MESSAGE_HANDLERS.push(MailHandler);
    // MESSAGE_HANDLERS.push(MotionHandler);

    // DM_HANDLERS.push(DebugCommand.generateMessageHandler(CLIENT));
    DM_HANDLERS.push(BallotCommand.generateWriteInHandler(CLIENT));

    setInterval(() => {
        PollCommand.voteData.filter(v => v.message === '-1' && v.question && (new Date(v.initDate) <= new Date()))
                .forEach(PollCommand.runSchedule(CLIENT));
        BallotCommand.voteData.filter(v => v.message === '-1' && !v.question && (new Date(v.initDate) <= new Date()))
                .forEach(BallotCommand.runSchedule(CLIENT));
        MeetingsCommand.refresh(CLIENT, CHANS.MEETINGS_CHAN);
    }, 30000);

    console.log('NPD Bot Online.');
});

CLIENT.login(CREDS.secret).catch(console.log);