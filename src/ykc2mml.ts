#!/usr/bin/env node
import minimist from 'minimist';
import fs from 'fs-extra';
import path from 'path';
import beautify from 'json-beautify';
import parser from './lib/parser';
import amml from './lib/amml';
import amk, { type BrrNameMap } from './lib/amk';

interface CLIArgs extends minimist.ParsedArgs {
    entryptr?: number | string;
    doubletick?: number | string;
    brrnamemap?: string;
    h?: boolean;
    help?: boolean;
    ['disable-superloop']?: boolean;
}

const argv = minimist<CLIArgs>(process.argv.slice(2));

if (argv._.length < 1 || argv.h || argv.help) {
    console.log('usage: ykc2mml.js spc_file [--entryptr pos] [--doubletick times] [--disable-superloop] [--brrnamemap map_file]');
    process.exit(1);
}

const entryPtr = typeof argv.entryptr === 'undefined' ? 0x1C00 : Number(argv.entryptr);
const spcPath = path.resolve(process.cwd(), String(argv._[0]));
const spcPathParsed = path.parse(spcPath);
const spc = fs.readFileSync(spcPath);
const brrNameMap: BrrNameMap = argv.brrnamemap ? fs.readJSONSync(path.resolve(process.cwd(), argv.brrnamemap), { encoding: 'utf8' }) : {};
const ast = parser(spc, entryPtr);
const doubleTick = typeof argv.doubletick === 'undefined' ? 1 : Math.floor(Number(argv.doubletick));
const enableSuperLoop = !(argv['disable-superloop']);
const mml = amml(ast, spc, false, doubleTick, enableSuperLoop);
const finalTxt = amk(mml, ast, spc, spcPath, brrNameMap);
fs.writeFileSync(path.join(spcPathParsed.dir, `${spcPathParsed.name}.json`), beautify(ast, null, 2, 80), { encoding: 'utf8' });
fs.writeFileSync(path.join(spcPathParsed.dir, `${spcPathParsed.name}.txt`), finalTxt, { encoding: 'utf8' });
