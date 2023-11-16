'use strict';

import BaseCommand from '../baseCommand.js';

import UTILS from '../../utils/utils.js';
import DISCORD_UTILS from '../../utils/discord-utils.js';
import COMMAND_MAPPER from '../commandMapper.js';

export default class HelpCommand extends BaseCommand {
    static cmdData = {
        'page': 0,
        'perm': [],
        'validator': /^(\d+)$|^([a-z]+)? ?([a-z]+)?$/,
        'desc': `Displays this help interface.  Can be used in conjunction with another command to display help for that command.`,
        'syntax': [
            `[{command}][{param}]`,
            `[{page}]`
        ],
        'params': {
            'command': {
                'optional': true,
                'desc': `The command to get help with.  Omitting the command displays help for the help command.`,
                'syntax': `{command}`
            },
            'page': {
                'optional': true,
                'desc': `Provides a paged list of available commands.  Omitting the page displays help for the \`help\` command.`,
                'syntax': `1|2`
            }
        }
    };

    execute(params) {
        let helpText = '\n';
        let quickText;
        // no page or command.  help on help
        if (!params[1] && !params[2]) params[2] = 'help';
        if (params[2]) {
            params[2] = params[2].toLowerCase();
            const cmdData = (COMMAND_MAPPER['npd'][params[2]].class.cmdData || COMMAND_MAPPER['npd'][params[2]]);
            const helpCommand = !params[3]?cmdData:cmdData.params[params[3]];
            if (helpCommand && !DISCORD_UTILS.checkMemberRoles(this.member, cmdData.perm)) {
                helpText = `You do not have permission to run ${params[2]}.`
            } else if (helpCommand) {
                helpText += `__**LPD Bot Help for Command:**__ \`/npd ${params[2]+(params[3]?` ${helpCommand.syntax}`:'')}\`\n\n`;
                helpText += `${helpCommand.desc}\n\n`;
                if (!params[3]) helpText += `__Syntax:__\n${helpCommand.syntax.map(s => `\`/npd ${params[2]}${s?` ${s}`:''}\``).join('\n')}${helpCommand.params?`\n\n>>> `:''}`;
                else helpText += `__Syntax:__\n\`${params[2]} ${helpCommand.syntax}\`\n\n>>> `;
                quickText = helpText;
                helpText += (function recurseParam(root, level) {
                    if (!root.params) return '';
                    let params = Object.keys(root.params);
                    return `__Parameters:__\n${params.map(p => {
                        const recurse = recurseParam(root.params[p], level+1);
                        const reqd = `**${!root.params[p].optional}**`;
                        return `${UTILS.indent(level*2)}\`${p}\` - ${root.params[p].desc} *(Required: ${reqd})*\n`+
                                `${UTILS.indent(level*2+2)}**ie:**\t\`${root.params[p].syntax}\`\n`+
                                `${recurse?`${UTILS.indent(level*2+2)}${recurse}`:''}`;
                    }).join('')}`;
                })(helpCommand, 0);
            } else helpText = `Invalid Command: ${params[2]}`;
            if (helpText.length > 2000) {
                helpText = quickText;
                if (helpCommand.params) {
                    let params = Object.keys(helpCommand.params);
                    helpText += `\n\nThis command takes ${params.length} different parameters.  Append one of the parameters to the help command for details.\n\n\``;
                    helpText += params.join('\n')+'`';
                }
            }
        } else {
            helpText += `__**LPD Bot Help (Page ${params[1]})**__\n\n`
            helpText += Object.keys(COMMAND_MAPPER['npd'])
                    .filter(c => {
                        const cmdData = COMMAND_MAPPER['npd'][c].class.cmdData || COMMAND_MAPPER['npd'][c];
                        if (!cmdData.perm) return false;
                        return DISCORD_UTILS.checkMemberRoles(this.member, cmdData.perm) &&
                                cmdData.page === Number(params[1] || 0);
                    })
                    .map(c => `\`/npd ${c}\` - ${(COMMAND_MAPPER['npd'][c].class.cmdData || COMMAND_MAPPER['npd'][c]).desc}`).join('\n');
            if (!helpText) helpText = `Invalid Page Number: ${params[1]}`;
        }
        return this.ephemeral(helpText);
    }
}