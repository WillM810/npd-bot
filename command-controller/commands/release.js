'use strict';

import DISCORD from 'discord.js';

import BaseCommand from '../baseCommand.js';

import ROLES from '../../constants/roles.js';
import PERMS from '../../constants/permissions.js';

export default class ReleaseCommand extends BaseCommand {
    execute(params) {
        const releaseChannel = this.guild.channels.cache.get(params[1]);
        if (!releaseChannel) return this.ephemeral(`Cannot find channel: <#${params[1]}>`);
        releaseChannel.overwritePermissions(releaseChannel.permissionOverwrites.set(ROLES.GENERAL,
                new DISCORD.PermissionOverwrites(releaseChannel, { 'id': ROLES.GENERAL, 'allow': PERMS.OBSERVER_VOICE_PERMS, 'type': 'role' })));
        releaseChannel.send(`This channel was released on ${new Date().toLocaleString()}.`);
        this.ephemeral(`Releasing channel: ${releaseChannel.name}`);
    }
}