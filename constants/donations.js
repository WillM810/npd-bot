'use strict';

import DISCORD from 'discord.js';

export default new DISCORD.MessageEmbed().setTitle('Donate to the NPD').setURL('https://paypal.me/NonPartisanDE')
        .setDescription(`The Governing Board of the NPD requires about $500/yr to keep the lights on.`+
                `  Every dollar donated after that goes to supporting our endorsed and nominated candidates and `+
                `participating in local outreach events and other activities to further promote our organization.  `+
                `Thank you for your support!`);