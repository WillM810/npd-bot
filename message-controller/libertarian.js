'use strict';

export default class RealLibertarianResponder {
    static handleMessage(message) {
        if (message.content.toLowerCase().includes('real libertarian')) {
            const realLibertarian = {
                'data': {
                    'content': 'I am the only real Libertarian!',
                    'message_reference': {
                        'message_id': message.id
                    }
                }
            };
    
            return {
                'msg': realLibertarian,
                'cb': messageObj => {
                    message.channel.messages.fetch(messageObj.id).then(botMsg => botMsg.react(':npd:989704388870291526'));
                }
            };
        }
    }
}