'use strict';

import ROLES from '../constants/roles.js';
import CHANNELS from '../constants/channels.js';

import BaseCommand from './baseCommand.js';
import DebugCommand from './commands/debug.js';
import LinksCommand from './commands/links.js';
import SockCommand from './commands/sock.js';
import LinkCommand from './commands/link.js';
import ClearCommand from './commands/clear.js';
import RulesCommand from './commands/rules.js';
import ChannelCommand from './commands/channel.js';
import HelpCommand from './commands/help.js';
import MeetingsCommand from './commands/meetings.js';
import LegCommand from './commands/leg.js';
import SeenCommand from './commands/seen.js';
import ExecCommand from './commands/exec.js';
import ReleaseCommand from './commands/release.js';
import LockCommand from './commands/lock.js';
import RoleCommand from './commands/role.js';
import QuorumCommand from './commands/quorum.js';
import PollCommand from './commands/poll.js';
import BallotCommand from './commands/ballot.js';
import MuteCommand from './commands/mute.js';
import PostDocCommand from './commands/postDoc.js';
import LegLookup from '../message-controller/legLookup.js';

const POLL_VALIDATOR = /(?:(?=(?:.*?(init:\((?:(?:(\d{1,4}[-\./]\d{1,2}(?:[-\./]\d{1,4})?)?[T ])?(?:(\d{1,2})(?:[:\.]?(\d{0,2}))?)([ap]?)m?)\) ))?)(?=(?:.*?(url:\[([^\]]+)\]\(([^\)]+)\) ?))?)(?:\1?\6?)* ?(?!list|cancel)(.+)|(?:list:(\d+|\*))|(?:cancel:(\d+)))/;
const BALLOT_VALIDATOR = /(?:(?=(?:.*?(init:\((?:(?:(\d{1,4}[-\./]\d{1,2}(?:[-\./]\d{1,4})?)?[T ])?(?:(\d{1,2})(?:[:\.]?(\d{0,2}))?)([ap]?)m?)\) ))?)(?=(?:.*?(url:\[([^\]]+)\]\(([^\)]+)\) ?))?)(?=(?:.*?(secret:(true|false) ?))?)(?=(?:.*(approval:(true|false) ?))?)(?:\1?\6?\9?\11?)* ?(?!list|cancel)(.+)|(?:list:(\d+|\*))|(?:cancel:(\d+)))/;

export default {
    'npd': {
        'help': { 'class': HelpCommand },
        'leglookup': { 'class': LegLookup },
        'poll': {
            'page': 1,
            'perm': [ ROLES.MEMBERS ],
            'validator': POLL_VALIDATOR,
            'desc': `Creates an \`Aye\`, \`Abstain\`, and \`Nay\` poll accessible to all full participants in a channel.`,
            'syntax': [
                `list:{id}|*`,
                `cancel:{id}`,
                `[init:({time})] [url:[{label}]({url})] {question}`
            ],
            'class': PollCommand,
            'params': {
                'list': {
                    'optional': false,
                    'desc': `List scheduled polls.`,
                    'syntax': `list:{id}|*`,
                    'params': {
                        'id': {
                            'optional': false,
                            'desc': `Id of the scheduled poll to list details for.`,
                            'syntax': `{id}`
                        },
                        '*': {
                            'optional': false,
                            'desc': `Wildcard id to list all scheduled polls.`,
                            'syntax': `*`
                        }
                    }
                },
                'cancel': {
                    'optional': false,
                    'desc': `Cancel a scheduled poll.`,
                    'syntax': `cancel:{id}`,
                    'params': {
                        'id': {
                            'optional': false,
                            'desc': `Id of the scheduled poll to cancel.`,
                            'syntax': `{id}`
                        }
                    }
                },
                'url': {
                    'optional': true,
                    'desc': `Puts a hyperlink in the poll related to the question being decided.`,
                    'syntax': `url:[{label}]({url})`,
                    'params': {
                        'label': {
                            'optional': false,
                            'desc': `The label for the hyperlink.`,
                            'syntax': `[{label}]`
                        },
                        'url': {
                            'optional': false,
                            'desc': `The URL to link to.`,
                            'syntax': `({url})`
                        }
                    }
                },
                'init': {
                    'optional': true,
                    'desc': `Sets the initialization time for the poll to a time other than now.`,
                    'syntax': `init:({time})`,
                    'params': {
                        'time': {
                            'optional': false,
                            'desc': `Time to start the scheduled poll.`,
                            'syntax': `{time}`
                        }
                    }
                },
                'question': {
                    'optional': false,
                    'desc': `The question that is the subject of the poll.`,
                    'syntax': `{question}`
                }
            }
        },
        'ballot': {
            'page': 1,
            'perm': [ ROLES.MEMBERS ],
            'validator': BALLOT_VALIDATOR,
            'desc': `Creates a multiple choice ballot including options for NOTA and Write-Ins.  Defaults to a secret ballot.`,
            'syntax': [
                `list:{id}|*`,
                `cancel:{id}`,
                `[secret:true|false] [init:({time})] [url:[{label}]({url})] {issue}/{option}/...`
            ],
            'class': BallotCommand,
            'params': {
                'list': {
                    'optional': false,
                    'desc': `List scheduled polls.`,
                    'syntax': `list:{id}|*`,
                    'params': {
                        'id': {
                            'optional': false,
                            'desc': `Id of the scheduled poll to list details for.`,
                            'syntax': `{id}`
                        },
                        '*': {
                            'optional': false,
                            'desc': `Wildcard id to list all scheduled polls.`,
                            'syntax': `*`
                        }
                    }
                },
                'cancel': {
                    'optional': false,
                    'desc': `Cancel a scheduled poll.`,
                    'syntax': `cancel:{id}`,
                    'params': {
                        'id': {
                            'optional': false,
                            'desc': `Id of the scheduled poll to cancel.`,
                            'syntax': `{id}`
                        }
                    }
                },
                'url': {
                    'optional': true,
                    'desc': `Puts a hyperlink in the poll related to the question being decided.`,
                    'syntax': `url:[{label}]({url})`,
                    'params': {
                        'label': {
                            'optional': false,
                            'desc': `The label for the hyperlink.`,
                            'syntax': `[{label}]`
                        },
                        'url': {
                            'optional': false,
                            'desc': `The URL to link to.`,
                            'syntax': `({url})`
                        }
                    }
                },
                'init': {
                    'optional': true,
                    'desc': `Sets the initialization time for the poll to a time other than now.`,
                    'syntax': `init:({time})`,
                    'params': {
                        'time': {
                            'optional': false,
                            'desc': `Time to start the scheduled poll.`,
                            'syntax': `{time}`
                        }
                    }
                },
                'secret': {
                    'optional': true,
                    'desc': `Use a secret ballot.  Defaults to true if omitted.`,
                    'syntax': `secret:true|false`,
                    'params': {
                        'secret': {
                            'optional': false,
                            'desc': `Whether or not to use a secret ballot.  Defaults to true if omitted.`,
                            'syntax': `true|false`
                        }
                    }
                },
                'approval': {
                    'optional': true,
                    'desc': `Use approval voting.  Defaults to false if omitted.`,
                    'syntax': `secret:true|false`,
                    'params': {
                        'approval': {
                            'optional': false,
                            'desc': `Whether or not to use approval voting.  Defaults to false if omitted.`,
                            'syntax': `true|false`
                        }
                    }
                },
                'issue': {
                    'optional': false,
                    'desc': `The issue to be voted on and the choices to be selected from.`,
                    'syntax': `{issue}/{option}/...`,
                    'params': {
                        'option': {
                            'optional': false,
                            'desc': `The choices to be chosen from.`,
                            'syntax': `{option}/...`
                        }
                    }
                }
            }
        },
        'leg': { 'class': LegCommand },
        // 'exec': {
        //     'page': 1,
        //     'perm': [ ROLES.STATE_BOARD, ROLES.ADMIN ],
        //     'validator': /^([\d\w\s]+)$/,
        //     'desc': `Creates an executive session hidden from all except those with the <@&${ROLES.STATE_BOARD}> and <@&${ROLES.SB_GUESTS}> role.`,
        //     'syntax': [ `{name}` ],
        //     'class': ExecCommand,
        //     'params': {
        //         'name': {
        //             'optional': false,
        //             'desc': `The name of the new executive session.`,
        //             'syntax': `{name}`
        //         }
        //     }
        // },
        // 'lock': {
        //     'page': 1,
        //     'perm': [ ROLES.STATE_BOARD, ROLES.ADMIN ],
        //     'validator': /^<#(\d+)>$/,
        //     'desc': `Locks an executive session or legislative channel and moves it to the appropriate archive category.`,
        //     'syntax': [ `#{name}` ],
        //     'class': LockCommand,
        //     'params': {
        //         'name': {
        //             'optional': false,
        //             'desc': `The channel to be locked.`,
        //             'syntax': `#{name}`
        //         }
        //     }
        // },
        // 'release': {
        //     'page': 1,
        //     'perm': [ ROLES.STATE_BOARD, ROLES.ADMIN ],
        //     'validator': /^<#(\d+)>$/,
        //     'desc': `Releases an executive session, making it readable to the <@&${ROLES.GENERAL}> role.`,
        //     'syntax': [ `#{name}` ],
        //     'class': ReleaseCommand,
        //     'params': {
        //         'name': {
        //             'optional': false,
        //             'desc': `The channel to be released.`,
        //             'syntax': `#{name}`
        //         }
        //     }
        // },
        'mute': {
            'page': 1,
            'perm': [ ROLES.NPD_BOARD, ROLES.ADMIN ],
            'validator': /^<@!(\d+)>$/,
            'desc': `Strips all other roles from a user and assigns them to the <@&${ROLES.MUTED}> role.`,
            'syntax': [ `@{name}` ],
            'class': MuteCommand,
            'params': {
                'name': {
                    'optional': false,
                    'desc': `The user to mute.`,
                    'syntax': `@{name}`
                }
            }
        },
        // 'postdoc': {
        //     'page': 1,
        //     'perm': [ ROLES.ADMIN ],
        //     'validator': /^(LPD|NCC|KENT|SUSSEX) title:\(([\s\S]+)\) doc:\(([\s\S]*)\)$/,
        //     'desc': `Posts a Google Doc as HTML to the LPD/County website, shares the post to social media.`,
        //     'syntax': [ '{county} title:({title}) doc:({doc})' ],
        //     'class': PostDocCommand,
        //     'params': {
        //         'title': {
        //             'optional': false,
        //             'desc': `Title of the Site Post`,
        //             'syntax': 'title:({title})'
        //         },
        //         'doc': {
        //             'optional': false,
        //             'desc': `Link to Google Doc`,
        //             'syntax': 'doc:({doc})'
        //         }
        //     }
        // },
        // 'role': {
        //     'page': 1,
        //     'perm': [ ROLES.STATE_BOARD, ROLES.ADMIN ],
        //     'validator': /^<(?:(?:@&(\d+)>)|(?:#(\d+)>))(?:(?: (list|clear))| ?(?:(?:(?:<@!?(\d+)>)|(?:<@&(\d+)>))(?:(?<!^<@&.*) ?(advisor|force|viewer))?))$/,
        //     'desc': `Adjusts role assignments and channel permissions based on the parameters provided.`,
        //     'syntax': [
        //         `@{role} list|clear`,
        //         `@{role} @{user}`,
        //         `@{role} @{role}`,
        //         `#{channel} @{user}`,
        //         `#{channel} @{role} [advisor|force|viewer]`,
        //         `#{channel} list|clear`
        //     ],
        //     'class': RoleCommand,
        //     'params': {
        //         'role': {
        //             'optional': false,
        //             'desc': `Lists or changes role assignments based on the parameters provided.`,
        //             'syntax': `@{role}`,
        //             'params': {
        //                 'list': {
        //                     'optional': false,
        //                     'desc': `Lists all members with this assigned role.`,
        //                     'syntax': `list`
        //                 },
        //                 'clear': {
        //                     'optional': false,
        //                     'desc': `Clears members out of a temporary role like <@&${ROLES.SB_GUESTS}>.`,
        //                     'syntax': 'clear'
        //                 },
        //                 'user': {
        //                     'optional': false,
        //                     'desc': `Assigns users to this role.  Removes this role if it is already assigned.`,
        //                     'syntax': `@{user}`
        //                 },
        //                 'role': {
        //                     'optional': false,
        //                     'desc': `Assigns all members assigned this role to the first \`role\` parameter.`,
        //                     'syntax': `@{role}`
        //                 }
        //             }
        //         },
        //         'channel': {
        //             'optional': false,
        //             'desc': `Changes channel permissions based on the parameters provided.`,
        //             'syntax': `#{channel}`,
        //             'params': {
        //                 'list': {
        //                     'optional': false,
        //                     'desc': `Lists users and roles with access to the channel. (Not implemented)`,
        //                     'syntax': 'list'
        //                 },
        //                 'clear': {
        //                     'optional': false,
        //                     'desc': `Clears user specific channel permissions.`,
        //                     'syntax': `clear`
        //                 },
        //                 'user': {
        //                     'optional': false,
        //                     'desc': `Assigns an individual user participant permissions to the channel.  Can be removed with \`clear\`.`,
        //                     'syntax': `@{user}`
        //                 },
        //                 'role': {
        //                     'optional': false,
        //                     'desc': `Assigns or removes participant permissions to the channel for the role.`,
        //                     'syntax': `@{role} [advisor]`,
        //                     'params': {
        //                         'advisor': {
        //                             'optional': true,
        //                             'desc': `Grants participant permissions except view and history, which must be assigned elsewhere.  Prevents voting.`,
        //                             'syntax': `advisor`
        //                         },
        //                         'force': {
        //                             'optional': true,
        //                             'desc': `Used to remove permission sets other than participant or advisor from a channel.`,
        //                             'syntax': `force`
        //                         },
        //                         'viewer': {
        //                             'optional': true,
        //                             'desc': `Only grants permissions to view channels, not to participate in them.`,
        //                             'syntax': 'viewer'
        //                         }
        //                     }
        //                 }
        //             }
        //         }
        //     }
        // },
        'meetings': { 'class': MeetingsCommand },
        'ping': { 'class': BaseCommand },
        'debug': {
            'page': 2,
            'perm': [ ROLES.ADMIN ],
            'validator': /.*/,
            'desc': `Do a thing.`,
            'syntax': [ '' ],
            'class': DebugCommand
        },
        // 'rules': {
        //     'page': 2,
        //     'perm': [ ROLES.ADMIN ],
        //     'validator': /^$/,
        //     'desc': `Refresh the rules message.`,
        //     'syntax': [ '' ],
        //     'class': RulesCommand
        // },
        'clear': {
            'page': 2,
            'perm': [ ROLES.ADMIN ],
            'validator': /^$/,
            'desc': `Clears all messages from this channel.`,
            'syntax': [ '' ],
            'class': ClearCommand
        },
        'sock': {
            'page': 2,
            'perm': [ ROLES.NPD_BOARD ],
            'validator': /^(<#\d+>)? ?(.+)$/,
            'desc': `LPD Bot says what you tell it to like a sock puppet.`,
            'syntax': [ '[#{channel}] {message}' ],
            'class': SockCommand,
            'params': {
                'channel': {
                    'optional': true,
                    'desc': `The channel to send the message into.  Defaults to the current channel if omitted.`,
                    'syntax': `#{channel}`
                },
                'message': {
                    'optional': false,
                    'desc': `The message for LPD Bot to say.`,
                    'syntax': `{message}`
                }
            }
        },
        'link': {
            'page': 2,
            'perm': [ ROLES.ADMIN ],
            'validator': /^(http\S+)(?: (.*))?$/,
            'desc': `Creates an embedded link preview without the whole link appearing in the message, send by LPD Bot.`,
            'syntax': [ '{link} {label}' ],
            'class': LinkCommand,
            'params': {
                'link': {
                    'optional': false,
                    'desc': `The link to embed.`,
                    'syntax': '{link}'
                },
                'label': {
                    'optional': true,
                    'desc': `The label to apply to the link.  Defaults to the title that would display by default.`,
                    'syntax': '{label}'
                }
            }
        },
        'links': {
            'page': 2,
            'perm': [ ROLES.ADMIN ],
            'validator': /^$/,
            'desc': `Post the state's frequently used links to the current channel.`,
            'syntax': [ '' ],
            'class': LinksCommand
        },
        // 'channel': {
        //     'page': 2,
        //     'perm': [ ROLES.ADMIN ],
        //     'validator': /^([\w\s\d]+) <@&(\d+)>(?:<@&(\d+)>)?$/,
        //     'desc': `Creates a new channel under the "Private" category of channels.`,
        //     'syntax': [ '{channel-name} @{participant-role} [@{observer-role}]' ],
        //     'class': ChannelCommand,
        //     'params': {
        //         'channel-name': {
        //             'optional': false,
        //             'desc': `The name of the new channel.  Will be converted to lower case and all spaces replaced with dashes.`,
        //             'syntax': '{channel-name}'
        //         },
        //         'participant-role': {
        //             'optional': false,
        //             'desc': `This role will have participant permissions on the new channel, including the ability to send messages and attachments.`,
        //             'syntax': '@{participant-role}'
        //         },
        //         'observer-role': {
        //             'optional': true,
        //             'desc': `This role will have observer permissions on the new channel limited to seeing the channel and message history.`,
        //             'syntax': '@{observer-role}'
        //         }
        //     }
        // },
        'seen': {
            'page': 1,
            'perm': [],
            'validator': /^<@!?(\d+)>$|^<@&(\d+)>$/,
            'desc': `Displays the last time \`user\` was online, or the last time all users in a role were online.`,
            'syntax': [ '@{user}|@{role}' ],
            'class': SeenCommand,
            'params': {
                'user': {
                    'optional': false,
                    'desc': `The user to look for.`,
                    'syntax': '@{user}'
                },
                'role': {
                    'optional': false,
                    'desc': `The role to look for.`,
                    'syntax': '@{role}'
                }
            }
        },
        'quorum': {
            'page': 1,
            'perm': [ ROLES.MEMBERS ],
            'validator': /^<@&(\d+)>(?: (presence|react))?$/,
            'desc': `Initiates a quorum call for members of \`role\`.`,
            'syntax': [ '@{role} [presence|react]' ],
            'class': QuorumCommand,
            'params': {
                'role': {
                    'optional': false,
                    'desc': `The role to initiate a quorum call for.`,
                    'syntax': '@{role}'
                },
                'presence': {
                    'optional': true,
                    'desc': `Detect a quorum based on the presence of role members.`,
                    'syntax': '[presence]'
                },
                'react': {
                    'optional': true,
                    'desc': `Detect a quorum based on reactions to the quorum message from role members.  Default if excluded.`,
                    'syntax': '[react]'
                }
            }
        }
    }
}