'use strict';

import DISCORD from 'discord.js';

import DONATION_EMBED from '../constants/donations.js';

export default class DonateResponder {
    static handleMessage(message) {
        if (message.content.toLowerCase().match(/(\bdonat(e|ion))(\b|s)/)) {
            const donations = {
                'data': {
                    'content': 'Did someone say donate?',
                    'embed': new DISCORD.MessageEmbed(DONATION_EMBED),
                    'message_reference': {
                        'message_id': message.id
                    }
                }
            };
    
            return {
                'msg': donations,
                'cb': messageObj => {
                    message.channel.messages.fetch(messageObj.id).then(botMsg => botMsg.react(':npd:989704388870291526'));
                }
            };
        }
    }
}