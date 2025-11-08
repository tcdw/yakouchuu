import fs from 'fs-extra';
import path from 'path';
import beautify from 'json-beautify';
import parser from './lib/parser';
import amml from './lib/amml';
import amk, { type BrrNameMap } from './lib/amk';
import type { ConversionContext } from './lib/context';

export interface ConversionOptions {
  entryPtr?: number;
  doubleTick?: number;
  enableSuperLoop?: boolean;
  brrNameMapFile?: string;
  absTick?: boolean;
}

export function convert(spcFile: string, options: ConversionOptions = {}) {
  const spcPath = path.resolve(process.cwd(), spcFile);
  const spcPathParsed = path.parse(spcPath);
  const spc = fs.readFileSync(spcPath);
  const brrNameMap: BrrNameMap = options.brrNameMapFile
    ? fs.readJSONSync(path.resolve(process.cwd(), options.brrNameMapFile), { encoding: 'utf8' })
    : {};

  const context: ConversionContext = {
    spc,
    spcPath,
    brrNameMap,
    entryPtr: options.entryPtr ?? 0x1C00,
    doubleTick: options.doubleTick ?? 1,
    enableSuperLoop: options.enableSuperLoop ?? true,
    absTick: options.absTick ?? false,
  };

  parser(context);
  amml(context);
  amk(context);

  if (!context.ast || !context.finalTxt) {
    throw new Error('Conversion failed: AST or final text not generated.');
  }

  fs.writeFileSync(
    path.join(spcPathParsed.dir, `${spcPathParsed.name}.json`),
    beautify(context.ast, null, 2, 80),
    { encoding: 'utf8' }
  );
  fs.writeFileSync(
    path.join(spcPathParsed.dir, `${spcPathParsed.name}.txt`),
    context.finalTxt,
    { encoding: 'utf8' }
  );

  console.log(`Conversion complete. Files created:`);
  console.log(`  - ${spcPathParsed.name}.json`);
  console.log(`  - ${spcPathParsed.name}.txt`);
}
