'use strict';

import ROLES from '../constants/roles.js';
import USERS from '../constants/users.js';
import Mailer from '../utils/mailer.js';
import UTILS from '../utils/utils.js';

const MAIL_LISTS = {
    'legislators': [
        { 'name': 'Senator McBride', 'email': 'mcvay.will@gmail.com' },
        { 'name': 'Representative Bennett', 'email': 'citizenslave@gmail.com' }
    ],
    'test': [
        { 'name': 'Will McVay', 'email': 'mcvay.will@gmail.com' },
        { 'name': 'Will McVay', 'email': 'citizenslave@gmail.com' },
        { 'name': 'Will McVay', 'email': 'will.mcvay@lpdelaware.org' }
    ]
}

export default class MailHandler {
    static handleMessage(message) {
        if (message.mentions.users.has(USERS.ME) && message.content.toLowerCase().includes('email')) {
            if (message.reference.messageID && message.member && message.member.roles.cache.has(ROLES.STATE_CHAIR)) {
                const messageParams = message.content.split('\n');
                message.channel.messages.fetch(message.reference.messageID).then(m => {
                    const attachments = m.attachments.map(a => new Promise((resolve, reject) => {
                        UTILS.getHttpsRequest(a.url).then(d => resolve({ 'data': d, 'name': a.name })).catch(reject);
                    }));
                    attachments.push(Promise.resolve());

                    let fileAttachments = [];
                    Promise.all(attachments).then(buffers => {
                        if (buffers.length > 1) fileAttachments = buffers.filter(b => b);
                        Promise.all(MAIL_LISTS[messageParams[2] || 'test'].map(r => {
                            return Mailer.sendChairEmail(`${r.name} <${r.email}>`, messageParams[1], m.content.replace(/\n/g, '<br/>'), fileAttachments);
                        })).then(r => message.channel.send('Emails Sent!')).catch(e => message.channel.send(`ERROR: ${e}`));
                    });
                });
            }
        }
    }
}