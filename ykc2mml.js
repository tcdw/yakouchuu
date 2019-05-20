const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs-extra');
const path = require('path');
const parser = require('./lib/parser');

if (argv._.length < 1 || argv.h || argv.help) {
    console.log('usage: ykc2mml.js spc_file [--entryptr pos] [--doubletick times] [--brrnamemap map_file]');
    process.exit(1);
}

const entryPtr = typeof argv.entryptr === 'undefined' ? 0x1C00 : Number(argv.entryptr);
const spcPath = path.resolve(process.cwd(), argv._[0]);
const spc = fs.readFileSync(spcPath);
const ast = parser(spc, entryPtr);
