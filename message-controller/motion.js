'use strict';

import USERS from '../constants/users.js';

export default class MotionHandler {
    static handleMessage(message) {
        if (message.mentions.users.has(USERS.ME) && message.content.toLowerCase().includes('motion')) {
            console.log(message);
        }
    }
}