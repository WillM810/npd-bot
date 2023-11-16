'use strict';

import BaseCommand from '../baseCommand.js';

import CHANS from '../../constants/channels.js';
import PERMS from '../../constants/permissions.js';

export default class ChannelCommand extends BaseCommand {
    execute(params) {
        const channelName = params[1].toLowerCase().replace(/ +/, '-');
        const roles = [ params[2], params[3] ];
        const participantRole = roles[0];
        const spectatorRole = roles[1];
        const channelOptions = {
            'type': 'text',
            'parent': CHANS.PRIVATE_CAT,
            'permissionOverwrites': [{
                'id': participantRole,
                'type': 'role',
                'deny': 0n,
                'allow': PERMS.SPEAKER_VOICE_PERMS
            }]
        };
        if (spectatorRole && spectatorRole !== participantRole) channelOptions.permissionOverwrites.push({
            'id': spectatorRole,
            'type': 'role',
            'deny': 0n,
            'allow': PERMS.OBSERVER_VOICE_PERMS
        });
        this.guild.channels.create(channelName, channelOptions);
    }
}