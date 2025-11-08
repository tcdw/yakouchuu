#!/usr/bin/env node
import { Command } from 'commander';
import { convert } from './core';

const program = new Command();

program
  .name('ykc2mml')
  .description('Converts Yakouchuu SPC files to MML.')
  .version('1.0.0');

program
  .argument('<spc_file>', 'Path to the SPC file')
  .option('--entryptr <pos>', 'Entry pointer position', '0x1C00')
  .option('--doubletick <times>', 'Double tick times', '1')
  .option('--disable-superloop', 'Disable superloop')
  .option('--brrnamemap <map_file>', 'Path to the BRR name map file')
  .action((spcFile, options) => {
    const entryPtr = parseInt(options.entryptr, 16);
    const doubleTick = parseInt(options.doubletick, 10);
    const enableSuperLoop = !options.disableSuperloop;

    convert(spcFile, {
      entryPtr,
      doubleTick,
      enableSuperLoop,
      brrNameMapFile: options.brrnamemap,
    });
  });

program.parse(process.argv);
