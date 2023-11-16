'use strict';

import DISCORD from 'discord.js';

import BaseCommand from '../baseCommand.js';

import CHANS from '../../constants/channels.js';
import PERMS from '../../constants/permissions.js';

export default class LockCommand extends BaseCommand {
    execute(params) {
        const lockChannel = this.guild.channels.cache.get(params[1]);
        if (!lockChannel) return this.ephemeral(`Cannot find channel: <#${params[1]}>`);
        lockChannel.permissionOverwrites.set([]);
        if (lockChannel.parent.id === CHANS.LEG_CAT) {
            lockChannel.setParent(CHANS.LEG_ARCH_CAT, { 'lockPermissions': false });
        } else if (lockChannel.parent.id === CHANS.EXEC_SESSION_CAT) {
            lockChannel.setParent(CHANS.EXEC_ARCH_CAT, { 'lockPermissions': false });
        } else {
            lockChannel.setParent(CHANS.ARCHIVES_CAT, { 'lockPermissions': false });
        }
        lockChannel.send(`This channel was locked on ${new Date().toLocaleString()}.`);
        this.ephemeral(`Locked channel: ${lockChannel.name}`);
    }
}