'use strict';

import BaseCommand from '../baseCommand.js';

import CHANS from '../../constants/channels.js';
import ROLES from '../../constants/roles.js';
import PERMS from '../../constants/permissions.js';

export default class ExecCommand extends BaseCommand {
    execute(params) {
        const execChannelName = params[1].replace(/ /, '-').toLowerCase();
        const execChannelOptions = {
            'type': 'text',
            'parent': CHANS.EXEC_SESSION_CAT,
            'permissionOverwrites': [{
                'id': ROLES.STATE_BOARD,
                'type': 'role',
                'deny': 0n,
                'allow': PERMS.SPEAKER_VOICE_PERMS
            }]
        };
        this.ephemeral(null, true);
        this.guild.channels.create(execChannelName, execChannelOptions).then(channel => {
            this.ephemeral(`Created Executive Session: <#${channel.id}>`, true);
        });
    }
}