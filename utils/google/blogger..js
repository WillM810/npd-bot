'use strict';

import { google } from 'googleapis';

import GoogleClient from './google.js';

const blogIds = {
    'LPD': '4398000070034682732',
    'NCC': '6347973578423579386',
    'KENT': '3175086218625758383',
    'SUSSEX': '93726543792739757'
};

export default class Blogger extends GoogleClient {
    static getBlogger() {
        return new Promise((resolve, reject) => {
            this.getClient().then(client => {
                resolve(google.blogger({
                    'version': 'v3',
                    'auth': client
                }));
            }).catch(reject);
        });
    }

    static createPost(postData) {
        const postPayload = {
            'blogId': blogIds[postData.county],
            'requestBody': {
                'title': postData.title,
                'author': {
                    'id': '04785742411009255907'
                },
                'content': postData.html
            }
        };

        return new Promise((resolve, reject) => {
            if (postPayload.blogId) this.getBlogger().then(blogger => {
                blogger.posts.insert(postPayload).then(resolve).catch(reject);
            }).catch(reject);
        });
    }
}