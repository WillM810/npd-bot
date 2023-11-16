'use strict';

import { MongoClient, ServerApiVersion } from 'mongodb';

import CREDS from '../constants/creds.js';

export default class MongoConnector {
    static client;

    static defaultOptions = {
        'useNewUrlParser': true,
        'useUnifiedTopology': true,
        'serverApi': ServerApiVersion.v1
    };

    static testUrl = `mongodb+srv://${CREDS.MONGO.USER}:${CREDS.MONGO.PASS}@lpd-data.6t5d4.mongodb.net/`
            +`test?authSource=admin&replicaSet=atlas-vd2g32-shard-0&readPreference=primary&ssl=true`;

    static connect(url = this.testUrl, options = this.defaultOptions) {
        if (this.client) return Promise.resolve(this.client);
        return new Promise((resolve, reject) => {
            this.client = new MongoClient(url, options);
            this.client.connect(err => {
                if (err) reject(err);
                else resolve(this.client);
            });
        });
    }
}