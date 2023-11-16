'use strict';

import FS from 'fs';

class FilePersistenceEngine {
    filename;

    constructor(filename) {
        if (!filename.endsWith('.json')) filename += '.json';
        this.filename = filename;
    }

    readFile() {
        let contents = FS.readFileSync(this.filename, {'flag': 'a+'});
        return JSON.parse(contents.toString() || '[]');
    }

    writeFile(data) {
        FS.writeFileSync(this.filename, JSON.stringify(data));
    }
}

export default FilePersistenceEngine;