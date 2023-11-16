'use strict';

import DISCORD from 'discord.js';

import BaseCommand from '../baseCommand.js';

import ROLES from '../../constants/roles.js';
import PERMS from '../../constants/permissions.js';

const TEMP_ROLES = [
    ROLES.SB_GUESTS,
    ROLES.DELEGATES
];

export default class RoleCommand extends BaseCommand {
    execute(params) {
        if (params[1] && params[5]) {
            this.copyRole(params[1], params[5]);
        } else if (params[1] && params[4]) {
            this.assignUserToRole(params[1], params[4]);
        } else if (params[1] && params[3]) {
            this.roleAction(params[1], params[3]);
        } else if (params[2] && params[5]) {
            this.assignRoleToChannel(params[2], params[5], params[6]);
        } else if (params[2] && params[4]) {
            this.assignUserToChannel(params[2], params[4], params[6]);
        } else if (params[2] && params[3]) {
            this.channelAction(params[2], params[3]);
        }
    }

    copyRole(dstRole, srcRole) {
        if ((!this.member.roles.includes(ROLES.STATE_BOARD) || !TEMP_ROLES.includes(dstRole)) &&
            !this.member.roles.includes(ROLES.ADMIN)) return this.ephemeral('No permission.');
        this.ack();
        this.guild.members.fetch().then(members => {
            const membersAdded = [];
            members.forEach(member => {
                if (member.roles.cache.has(srcRole) && !member.roles.cache.has(dstRole)) {
                    member.roles.add(dstRole);
                    membersAdded.push(member.nickname || member.user.username);
                }
            });
            const response = `Added members:\n${membersAdded.join('\n')}`;
            this.complete(response);
        });
    }

    assignUserToRole(role, user) {
        if ((!this.member.roles.includes(ROLES.STATE_BOARD) || !TEMP_ROLES.includes(role)) &&
            !this.member.roles.includes(ROLES.ADMIN)) return this.ephemeral('No permission.');
        this.ack();
        this.guild.members.fetch(user).then(member => {
            if (member.roles.cache.has(role)) {
                member.roles.remove(role);
                this.complete('User role revoked');
            } else {
                member.roles.add(role);
                this.complete('User role granted');
            }
        });
    }

    assignRoleToChannel(channel, role, capacity) {
        const argChannel = this.guild.channels.cache.get(channel);
        const currentOverwrites = argChannel.permissionOverwrites;
        if (currentOverwrites.cache.has(role)) {
            currentOverwrites.delete(role);
            this.ephemeral('Removed role permissions from channel.');
        } else {
            const newBitfield = capacity === 'advisor'?PERMS.ADVISOR_PERMS:(capacity === 'viewer'?PERMS.OBSERVER_VOICE_PERMS:PERMS.SPEAKER_VOICE_PERMS);
            currentOverwrites.set([...currentOverwrites.cache.values(), { 'id': role, 'allow': [newBitfield] }]);
            this.ephemeral(`Assign ${capacity === 'advisor'?'advisor':(capacity === 'viewer'?'viewer':'participant')} permissions to channel.`);
        }
    }

    assignUserToChannel(channel, user) {
        const userChannel = this.guild.channels.cache.get(channel);
        if (userChannel.permissionOverwrites.has(user)) {
            userChannel.overwritePermissions(userChannel.permissionOverwrites.filter(o => o.id !== user));
            this.ephemeral('Removed user from channel.');
        } else {
            userChannel.overwritePermissions(userChannel.permissionOverwrites.set(user,
                    new DISCORD.PermissionOverwrites(userChannel, { 'id': user, 'allow': PERMS.SPEAKER_VOICE_PERMS, 'type': 'member' })));
            this.ephemeral('Added user to channel.');
        }
    }

    channelAction(channel, action) {
        const actionChannel = this.guild.channels.cache.get(channel);
        if (action === 'clear') {
            actionChannel.overwritePermissions(actionChannel.permissionOverwrites.filter(o => o.type !== 'member'));
            this.ephemeral('Cleared user overwrites in channel.');
        } else if (action === 'list') {
            this.ephemeral(`Not implemented.`)
        }
    }

    roleAction(role, action) {
        if ((!this.member.roles.includes(ROLES.STATE_BOARD) || !TEMP_ROLES.includes(role)) &&
            !this.member.roles.includes(ROLES.ADMIN)) return this.ephemeral('No permission.');
        this.ack();
        if (action === 'clear') {
            if (!TEMP_ROLES.includes(role) && this.member.user.id !== this.guild.ownerID) return this.complete('Not a temp role.');
            this.guild.members.fetch().then(members => {
                members.forEach(member => {
                    if (member.roles.cache.has(role)) member.roles.remove(role);
                });
                return this.complete('Cleared role.');
            });
        } else if (action === 'list') {
            this.guild.members.fetch().then(members => {
                const list = members.filter(m => m.roles.cache.has(role)).map(m => m.nickname || m.user.username).join('\n');
                return this.complete(`Members with role <@&${role}>:\n${list}`);
            });
        }
    }
}