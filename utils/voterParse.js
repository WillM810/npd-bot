import MPE from './MongoPersistenceEngine.js';
import FS from 'fs';

const BATCH_SIZE = 10000;

if (!process.argv[2]) {
    console.error('No file provided.');
    process.exit();
}

console.log(`Reading voters from: ${process.argv[2]}`)
FS.readFile(process.argv[2], (err, data) => {
    console.log(`Read voters from file.`);
    if (err) {
        console.error(err);
        process.exit();
    }
    const splitData = data.toString().split('\r\n');
    const fields = splitData[0].split('\t');
    console.log(`Read ${splitData.length - 1} voters with ${fields.length} data fields.`);

    console.log(`Transforming TSV voters to JSON.`);
    const voters = splitData.slice(1).map((v, idx) => {
        const voterData = v.split('\t');
        const voter = {};
        voterData.forEach((f, idx) => voter[fields[idx]] = f.trim());
        voter['loadedAt'] = Date.now();
        voter['loadedBy'] = 0;
        if (!(idx % BATCH_SIZE)) process.stdout.write('.');
        return voter;
    });

    console.log(`\nPersisting voters to database.`);
    MPE.connect('npd-data', process.argv[3] || 'voters', 'mongodb://localhost').then(persistVoters => {
        const batches = [];
        console.log(`Creating ${Math.ceil(voters.length / BATCH_SIZE)} batches of ${BATCH_SIZE}.`);
        while (voters.length) {
            const batch = voters.splice(0, BATCH_SIZE);
            process.stdout.write('.');
            batches.push(persistVoters.writeFile(batch).then(r => process.stdout.write('.')));
        }
        console.log(`\nRunning ${batches.length} batches.`);
        Promise.all(batches).then(() => {
            console.log('\nCreating indexes.');
            persistVoters.collection.createIndexes([{ key: { '$**': 1 } }]).then(() => {
                console.log('Done.');
                process.exit();
            });
        });
    });
});