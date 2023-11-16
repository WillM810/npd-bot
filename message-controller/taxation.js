'use strict';

export default class TaxationResponder {
    static handleMessage(message) {
        if (message.content.toLowerCase().includes('taxation')) {
            const taxationIsTheft = {
                'data': {
                    'content': 'Taxation is theft!',
                    'message_reference': {
                        'message_id': message.id
                    }
                }
            };

            return {
                'msg': (taxationIsTheft),
                'cb': messageObj => {
                    message.channel.messages.fetch(messageObj.id).then(botMsg => botMsg.react(':npd:989704388870291526'));
                }
            };
        }
    }
}