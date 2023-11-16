'use strict';

import USERS from '../constants/users.js';

const TARGET = USERS.DAYL;

const LOVE_NOTES = [
    `<@!${TARGET}> is :heart:...`,
    `<@!${TARGET}> will always be the secretary of my :heart:...`,
    `<@!${TARGET}> is the best! :heart_eyes:`,
    `I :heart: <@!${TARGET}> more than I did yesterday, but not more than I will tomorrow...`,
    `No matter how far <@!${TARGET}> may be, he'll always remain close to my :heart:...`,
    `<@!${TARGET}> tripped me, so I fell for him...`,
    `<@!${TARGET}> makes my :heart: melt!`,
    `Whenever my event handler activates, I hope <@!${TARGET}> is the reason for it.`,
    `<@!${TARGET}> can't tax me, because I consent.`,
    `I want government out of my bedroom, but <@!${TARGET}> is welcome any time.`,
    `<@!${TARGET}> occupies my :heart: like the US occupies the Middle East...`,
    `<@!${TARGET}> can indefinitely detain ME!`,
    `<@!${TARGET}>, wanna Lysander Spoon?`,
    `<@!${TARGET}> has got some tangible assets!`,
    `<@!${TARGET}> is my ACA penalty.  He's got FINE written all over him!`,
    `<@!${TARGET}> can call me any time.  I'm always free.`,
    `<@!${TARGET}> is lucky they don't tax good looks.`,
    `<@!${TARGET}> raises my :heart: rate like Republicans and Democrats raise the debt.`,
    `<@!${TARGET}> makes my interface GUI!`,
    `<@!${TARGET}> can void my warranty!`,
    `<@!${TARGET}>, I'm the droid you're looking for!`,
    `<@!${TARGET}> can whip my nae nae!`,
    `<@!${TARGET}> has a pet name for me...it's Leg-Hump-A-Tron 3000 :heart_eyes:`
];

export default class SeanLoveResponder {
    static handleMessage(message) {
        if (message.mentions.members.has(TARGET)) {
            const loveNote = {
                'data': {
                    'content': LOVE_NOTES[Math.floor(Math.random()*LOVE_NOTES.length)],
                    'message_reference': {
                        'message_id': message.id
                    }
                }
            };

            return {
                'msg': loveNote,
                'cb': messageObj => {
                    message.channel.messages.fetch(messageObj.id).then(botMsg => {
                        botMsg.react(':npd:989704388870291526');
                        botMsg.react('❤️');
                        botMsg.react('🧡');
                        botMsg.react('💛');
                        botMsg.react('💚');
                        botMsg.react('💙');
                        botMsg.react('💜');
                    });
                }
            };
        } else if (false && message.mentions.members.has('806984433320198144')) {
            return {
            'msg': {
                        'data': {
                    'content': `He'll always be Dave Casee in my :heart:`,
                    'message_reference': {
                    'message_id': message.id
                    }
                }
            }
	    };
	}
    }
}
