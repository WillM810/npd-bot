'use strict';

import { google } from 'googleapis';
import fs from 'fs';
import readline from 'readline';

const scopes = [
    'https://mail.google.com',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/blogger',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/photoslibrary'
];

export default class GoogleClient {
    static client;

    static getClient() {
        if (this.client) return Promise.resolve(this.client);

        return new Promise((resolve, reject) => {
            fs.readFile(process.cwd()+'/data/credentials.json', (error, credentials) => {
                if (error) reject(process.cwd()+'/'+error);

                const { client_secret, client_id, redirect_uris } = JSON.parse(credentials).installed;
                const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
                fs.readFile(process.cwd()+'/data/token.json', (error, token) => {
                    if (error) {
                        const authUrl = oAuth2Client.generateAuthUrl({
                            'access_type': 'offline',
                            'scope': scopes
                        });

                        console.log('Authorize app: ', unescape(authUrl));
                        const rl = readline.createInterface({
                            'input': process.stdin,
                            'output': process.stdout
                        });
                        rl.question('CODE: ', code => {
                            rl.close();

                            oAuth2Client.getToken(code, (error, token) => {
                                if (error) reject(error);
                                oAuth2Client.credentials = token;
                                fs.writeFile(process.cwd()+'/data/token.json', JSON.stringify(token), e => {
                                    this.client = oAuth2Client;
                                    resolve(this.client);
                                });
                            });
                        });
                    } else {
                        oAuth2Client.credentials = JSON.parse(token);
                        this.client = oAuth2Client;
                        resolve(this.client);
                    }
                });
            });
        });
    }

    static getMailer() {
        return new Promise((resolve, reject) => {
            this.getClient().then(client => {
                resolve(google.gmail({
                    'version': 'v1',
                    'auth': client
                }));
            });
        });
    }

    static getDrive() {
        return new Promise((resolve, reject) => {
            this.getClient().then(client => {
                resolve(google.drive({
                    'version': 'v3',
                    'auth': client
                }));
            });
        });
    }
}