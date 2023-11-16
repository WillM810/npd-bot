'use strict';

import USERS from '../constants/users.js';

export default class RPSHandler {
    static handleMessage(message) {
        if (message.mentions.users.has(USERS.ME) && message.content.toLowerCase().includes('rps')) {
            const selection = message.content.toLowerCase().split(' ')[2];
            switch(selection) {
            case 'guns':
                message.channel.send(`Guns defeat rocks, paper, and scissors.  You win...`);
                break;
            case 'rock':
                switch(Math.floor(Math.random()*3)) {
                case 0:
                    message.channel.send(`Paper, you lose.`);
                    break;
                case 1:
                    message.channel.send(`Rock, tie.`);
                    break;
                case 2:
                    message.channel.send(`Scissors, you win.`);
                    break;
                }
                break;
            case 'paper':
                switch(Math.floor(Math.random()*3)) {
                case 0:
                    message.channel.send(`Scissors, you lose.`);
                    break;
                case 1:
                    message.channel.send(`Paper, tie.`);
                    break;
                case 2:
                    message.channel.send(`Rock, you win.`);
                    break;
                }
                break;
            case 'scissors':
                switch(Math.floor(Math.random()*3)) {
                case 0:
                    message.channel.send(`Rock, you lose.`);
                    break;
                case 1:
                    message.channel.send(`Scissors, tie.`);
                    break;
                case 2:
                    message.channel.send(`Paper, you win.`);
                    break;
                }
                break;
            default:
                message.channel.send(`I don't understand.  Please use \`@LPD Bot rps rock/paper/scissors\` to play.`);
            }
        }
    }
}