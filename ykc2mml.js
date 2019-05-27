const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs-extra');
const path = require('path');
const beautify = require('json-beautify');
const parser = require('./lib/parser');
const amml = require('./lib/amml');
const amk = require('./lib/amk');

if (argv._.length < 1 || argv.h || argv.help) {
    console.log('usage: ykc2mml.js spc_file [--entryptr pos] [--doubletick times] [--disable-superloop] [--brrnamemap map_file]');
    process.exit(1);
}

const entryPtr = typeof argv.entryptr === 'undefined' ? 0x1C00 : Number(argv.entryptr);
const spcPath = path.resolve(process.cwd(), argv._[0]);
const spc = fs.readFileSync(spcPath);
const brrNameMap = argv.brrnamemap ? fs.readJSONSync(argv.brrnamemap, { encoding: 'utf8' }) : {};
const ast = parser(spc, entryPtr);
const mml = amml(ast, spc, false, typeof argv.doubletick === 'undefined' ? 1 : Math.floor(Number(argv.doubletick)), !(argv['disable-superloop']));
const finalTxt = amk(mml, ast, spc, spcPath, brrNameMap);
fs.writeFileSync(`${spcPath}.json`, beautify(ast, null, 2, 80), { encoding: 'utf8' });
fs.writeFileSync(`${spcPath}.txt`, finalTxt, { encoding: 'utf8' });
