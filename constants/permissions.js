'use strict';

import DISCORD from 'discord.js';

export default {
    'DISCORD_PERMS': DISCORD.Permissions.FLAGS,
    'ADVISOR_PERMS': DISCORD.Permissions.FLAGS.VIEW_CHANNEL |
                DISCORD.Permissions.FLAGS.CONNECT |
                DISCORD.Permissions.FLAGS.SPEAK |
                DISCORD.Permissions.FLAGS.USE_VAD |
                DISCORD.Permissions.FLAGS.START_EMBEDDED_ACTIVITIES |
                DISCORD.Permissions.FLAGS.STREAM |
                DISCORD.Permissions.FLAGS.VIEW_CHANNEL |
                DISCORD.Permissions.FLAGS.READ_MESSAGE_HISTORY |
                DISCORD.Permissions.FLAGS.SEND_MESSAGES |
                DISCORD.Permissions.FLAGS.ADD_REACTIONS |
                DISCORD.Permissions.FLAGS.MENTION_EVERYONE |
                DISCORD.Permissions.FLAGS.ATTACH_FILES |
                DISCORD.Permissions.FLAGS.EMBED_LINKS |
                DISCORD.Permissions.FLAGS.USE_EXTERNAL_EMOJIS |
                DISCORD.Permissions.FLAGS.CREATE_PRIVATE_THREADS |
                DISCORD.Permissions.FLAGS.CREATE_PUBLIC_THREADS |
                DISCORD.Permissions.FLAGS.USE_EXTERNAL_STICKERS |
                DISCORD.Permissions.FLAGS.SEND_MESSAGES_IN_THREADS,
    'OBSERVER_VOICE_PERMS': DISCORD.Permissions.FLAGS.VIEW_CHANNEL |
                DISCORD.Permissions.FLAGS.CONNECT |
                DISCORD.Permissions.FLAGS.VIEW_CHANNEL |
                DISCORD.Permissions.FLAGS.READ_MESSAGE_HISTORY,
    'SPEAKER_VOICE_PERMS': DISCORD.Permissions.FLAGS.VIEW_CHANNEL |
                DISCORD.Permissions.FLAGS.CONNECT |
                DISCORD.Permissions.FLAGS.SPEAK |
                DISCORD.Permissions.FLAGS.USE_VAD |
                DISCORD.Permissions.FLAGS.START_EMBEDDED_ACTIVITIES |
                DISCORD.Permissions.FLAGS.STREAM |
                DISCORD.Permissions.FLAGS.VIEW_CHANNEL |
                DISCORD.Permissions.FLAGS.READ_MESSAGE_HISTORY |
                DISCORD.Permissions.FLAGS.SEND_MESSAGES |
                DISCORD.Permissions.FLAGS.ADD_REACTIONS |
                DISCORD.Permissions.FLAGS.MENTION_EVERYONE |
                DISCORD.Permissions.FLAGS.ATTACH_FILES |
                DISCORD.Permissions.FLAGS.EMBED_LINKS |
                DISCORD.Permissions.FLAGS.USE_EXTERNAL_EMOJIS |
                DISCORD.Permissions.FLAGS.CREATE_PRIVATE_THREADS |
                DISCORD.Permissions.FLAGS.CREATE_PUBLIC_THREADS |
                DISCORD.Permissions.FLAGS.USE_EXTERNAL_STICKERS |
                DISCORD.Permissions.FLAGS.SEND_MESSAGES_IN_THREADS |
                DISCORD.Permissions.FLAGS.USE_APPLICATION_COMMANDS,
    'REQD_VOTE_PERMS': DISCORD.Permissions.FLAGS.VIEW_CHANNEL |
                DISCORD.Permissions.FLAGS.READ_MESSAGE_HISTORY |
                DISCORD.Permissions.FLAGS.SEND_MESSAGES |
                DISCORD.Permissions.FLAGS.USE_APPLICATION_COMMANDS &
                ~DISCORD.Permissions.FLAGS.ADMINISTRATOR
}
