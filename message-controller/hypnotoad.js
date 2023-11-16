'use strict';

export default class HypnoToadResponder {
    static handleMessage(message) {
        if (message.content.toLowerCase().includes('off the deep end')) {
            const hypnotoad = {
                'data': {
                    'content': 'https://www.overthinkingit.com/wp-content/uploads/2013/09/hypnotoad-animated.gif',
                    'message_reference': {
                        'message_id': message.id
                    }
                }
            };

            return {
                'msg': (hypnotoad),
                'cb': messageObj => {
                    message.channel.messages.fetch(messageObj.id).then(botMsg => botMsg.react(':npd:989704388870291526'));
                }
            }
        }
    }
}