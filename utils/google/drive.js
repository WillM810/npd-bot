'use strict';

import { google } from 'googleapis';

import GoogleClient from './google.js';

export default class Drive extends GoogleClient {
    static getDrive() {
        return new Promise((resolve, reject) => {
            this.getClient().then(client => {
                resolve(google.drive({
                    'version': 'v3',
                    'auth': client
                }));
            }).catch(reject);
        });
    }

    static getDocHTML(fileId) {
        const postData = {
            'fileId': fileId,
            'mimeType': 'text/html'
        };

        return new Promise((resolve, reject) => {
            this.getDrive().then(drive => {
                drive.files.export(postData, { 'responseType': 'stream' }).then(stream => {
                    const dataChunks = [];
                    stream.data.on('data', data => {
                        dataChunks.push(data);
                    });
                    stream.data.on('end', () => {
                        resolve(dataChunks.join(''));
                    });
                    stream.data.on('error', reject);
                });
            });
        });
    }
}