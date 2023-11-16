'use strict';

import { ObjectID } from 'mongodb';
import MongoConnector from "./MongoConnector.js";

export default class MongoPersistenceEngine {
    collection;

    static connect(db, collection, url = null, options = null) {
        return new Promise((resolve, reject) => {
            const engine = new MongoPersistenceEngine();
            MongoConnector.connect(url || MongoConnector.url, options || MongoConnector.defaultOptions).then(client => {
                engine.collection = client.db(db).collection(collection);
                resolve(engine);
            }).catch(reject);
        });
    }

    readFile() {
        return this.collection.find({}).toArray();
    }

    writeFile(data) {
        const bulkOps = data.map(d => {
            return {
                'updateOne': {
                    'filter': { '_id': new ObjectID(d._id) || undefined },
                    'update': {
                        '$set': d
                    },
                    'upsert': true
                }
            }
        });
        return this.collection.bulkWrite(bulkOps);
    }
}