import type { ParserResult } from './parser';
import type { AMMLResult } from './amml';
import type { BrrNameMap } from './amk';

/**
 * The shared context for a conversion process.
 */
export interface ConversionContext {
  // Input
  spc: Buffer;
  spcPath: string;

  // Options
  entryPtr: number;
  doubleTick: number;
  enableSuperLoop: boolean;
  brrNameMap: BrrNameMap;
  absTick: boolean;

  // Intermediate & Final Data
  ast?: ParserResult;
  mml?: AMMLResult;
  finalTxt?: string;
}
