'use strict';

import USERS from '../constants/users.js';
import ROLES from '../constants/roles.js';

export default class MessagePinner {
    static handleMessage(message) {
        // if (message.mentions.users.has(USERS.ME) && message.content.toLowerCase().includes('pin')) {
        //     if (message.reference.messageID && message.member && message.member.roles.cache.has(ROLES.STATE_BOARD)) {
        //         message.channel.messages.fetch(message.reference.messageID).then(m => m.pin());
        //     }
		// }
    }
}
