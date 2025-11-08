import { trace8, trace16, pad } from './hexAddr';
import printBuffer from './printBuffer';
import type { ConversionContext } from './context';

const notes = ['c', 'c+', 'd', 'd+', 'e', 'f', 'f+', 'g', 'g+', 'a', 'a+', 'b'];
const defaultFIR = [
    [0x7F, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    [0x58, 0xBF, 0xDB, 0xF0, 0xFE, 0x07, 0x0C, 0x0C],
    [0x0C, 0x21, 0x2B, 0x2B, 0x13, 0xFE, 0xF3, 0xF9],
    [0x34, 0x33, 0x00, 0xD9, 0xE5, 0x01, 0xFC, 0xEB],
];

export interface AMMLResult {
    channels: string[];
    patches: number[];
}

const toSignedByte = (value: number): number => (value << 24) >> 24;

const getNoteLenForMML = (tick: number, division: number, absTick: boolean): string => {
    const dotMax = 6;
    const note = division * 4;
    let text = '';
    if (!absTick) {
        for (let l = 1; l <= note; l += 1) {
            let cTick = 0;
            for (let dot = 0; dot <= dotMax; dot += 1) {
                const ld = (l << dot);
                if (note % ld) {
                    break;
                }
                cTick += note / ld;
                if (tick === cTick) {
                    text += l;
                    for (let k = dot; k > 0; k -= 1) {
                        text += '.';
                    }
                    return text;
                }
            }
        }
    }
    return `=${tick}`;
};

function amml(context: ConversionContext): void {
    const { ast, spc, absTick, doubleTick, enableSuperLoop: superloop } = context;
    if (!ast) {
        throw new Error('AST not found in context. Run parser first.');
    }

    const channels: string[] = [];
    const patches: number[] = [];
    for (let i = 0; i < 8; i += 1) {
        const cSeq = ast.sequences[i];
        const chan: string[] = [`#${i}\n`];
        let volumeA = 255;
        let volumeB = 255;
        let volumePrev = 0;
        let volumeNow = 0;
        let octavePrev = 0;
        let octaveNow = 0;
        let lenRateA = 7;
        let lenRateB = 7;
        let lenRatePrev = 0;
        let lenRateNow = 0;
        let lastNote = 0;
        let echoVolumeL = 0;
        let echoVolumeR = 0;
        let echoEnabled = 0;
        let slurState = false;
        let inBucketState = false;
        if (i === 0) {
            chan.push(`$F1 ${trace8(ast.echoDelay)} ${trace8(ast.echoFeedback)} $01 `);
            if (ast.echoFIR !== 0) {
                chan.push(`\n$F5 ${printBuffer(defaultFIR[ast.echoFIR])} \n`);
            }
        }
        for (let j = 0; j < cSeq.length; j += 1) {
            const item = cSeq[j].d;
            const addr = cSeq[j].addr;
            if (ast.mentionedAddr.indexOf(addr) >= 0) {
                chan.push(`\n; !!! ${trace16(addr)} is mentioned !!!\n`);
            }
            if ((item[0] > 0 && item[0] <= 0x56) || item[0] === 0xF9 || item[0] === 0xFA) {
                const isSlur = item[0] === 0xF9;
                const isAlt = item[0] === 0xFA;
                const off = (isSlur || isAlt) ? 1 : 0;
                const note = item[off] - 1;
                let len = (item[off + 1] & 0x7F) * doubleTick;
                const fullLen = len;
                volumePrev = volumeNow;
                volumeNow = item[off + 1] >= 0x80 ? volumeA : volumeB;
                if (volumePrev !== volumeNow) {
                    chan.push(`v${volumeNow} `);
                }
                lenRatePrev = lenRateNow;
                lenRateNow = isAlt ? lenRateA : lenRateB;
                if (lenRatePrev !== lenRateNow) {
                    chan.push(`q${lenRateNow}f `);
                }

                const warnStr = 'Warning: A slur change happened inside a loop bucket';
                if (isSlur) {
                    if (!slurState) {
                        if (inBucketState) {
                            console.warn(warnStr);
                            chan.splice(lastNote, 0, `\n; ###### ${warnStr}\n`);
                        }
                        chan.splice(lastNote, 0, '\n$F4 $01 \n');
                        slurState = true;
                    }
                } else if (slurState) {
                    if (inBucketState) {
                        console.warn(warnStr);
                        chan.splice(lastNote, 0, `\n; ###### ${warnStr}\n`);
                    }
                    len = Math.round(len / 2);
                    slurState = false;
                }

                let noteStr = '';
                if (note === 0x54) {
                    noteStr += 'r';
                } else if (note === 0x55) {
                    noteStr += '^';
                } else {
                    octavePrev = octaveNow;
                    octaveNow = Math.floor(note / 12) + 1;
                    if (octavePrev !== octaveNow) {
                        noteStr += `o${octaveNow} `;
                    }
                    noteStr += notes[note % 12];
                }
                noteStr += getNoteLenForMML(len, 48, absTick);
                chan.push(`${noteStr} `);
                lastNote = chan.length - 1;

                if (len !== fullLen) {
                    const restLen = fullLen - len;
                    chan.push(`$F4 $01 ^${getNoteLenForMML(restLen, 48, absTick)} `);
                }
                continue;
            }
            switch (item[0]) {
                case 0xE0: {
                    if (patches.indexOf(item[1]) < 0) {
                        patches.push(item[1]);
                    }
                    chan.push(`\nPATCH${pad(item[1], 3)} `);
                    break;
                }
                case 0xE1: {
                    if (item[1] <= 20) {
                        chan.push(`y${item[1]} `);
                    } else {
                        const echoL = (item[1] >> 7) % 2;
                        const echoR = (item[1] >> 6) % 2;
                        chan.push(`y${item[1]},${echoL},${echoR} `);
                    }
                    break;
                }
                case 0xE3: {
                    chan.push(`\n; ★ Vibrato: ${printBuffer(item)}\n`);
                    break;
                }
                case 0xE5: {
                    chan.push(`w${item[1]} `);
                    break;
                }
                case 0xE7: {
                    chan.push(`t${item[1] * doubleTick} `);
                    break;
                }
                case 0xE9: {
                    chan.push(`$E4 ${trace8(item[1])} `);
                    break;
                }
                case 0xEA: {
                    chan.push(`$FA $02 ${trace8(item[1])} `);
                    break;
                }
                case 0xEB: {
                    chan.push(`$ED ${trace8(item[1])} ${trace8(item[2])} `);
                    break;
                }
                case 0xED: {
                    volumeA = item[1];
                    volumeB = item[2];
                    break;
                }
                case 0xF0: {
                    chan.push(`\n; ★ Portamento: ${printBuffer(item)}\n`);
                    break;
                }
                case 0xF1: {
                    let computedL = Math.round((toSignedByte(item[1]) / spc[0x1010C]) * 127);
                    let computedR = Math.round((toSignedByte(item[2]) / spc[0x1011C]) * 127);
                    const eofStr = 'Warning: Echo volume overflow';
                    if (computedL > 127) {
                        console.warn(eofStr);
                        computedL = 127;
                    }
                    if (computedR > 127) {
                        console.warn(eofStr);
                        computedR = 127;
                    }
                    if (computedL < -128) {
                        console.warn(eofStr);
                        computedL = -128;
                    }
                    if (computedR < -128) {
                        console.warn(eofStr);
                        computedR = -128;
                    }
                    if (computedL < 0) computedL = 256 + computedL;
                    if (computedR < 0) computedR = 256 + computedR;
                    echoVolumeL = computedL;
                    echoVolumeR = computedR;
                    chan.push(`\n$EF ${trace8(echoEnabled)} ${trace8(echoVolumeL)} ${trace8(echoVolumeR)} \n`);
                    break;
                }
                case 0xF2: {
                    echoEnabled = item[1];
                    chan.push(`\n$EF ${trace8(echoEnabled)} ${trace8(echoVolumeL)} ${trace8(echoVolumeR)} \n`);
                    break;
                }
                case 0xF4: {
                    lenRateA = item[1];
                    lenRateB = item[2];
                    break;
                }
                case 0xFB: {
                    chan.push(superloop ? '\n[[' : '\n[');
                    inBucketState = true;
                    break;
                }
                case 0xFE: {
                    chan.push(superloop ? `]]${item[1]} \n` : `]${item[1]} \n`);
                    inBucketState = false;
                    break;
                }
                default: {
                    chan.push(`\n; ${printBuffer(item)}\n`);
                    break;
                }
            }
        }
        channels[i] = chan.join('');
    }
    context.mml = {
        channels,
        patches,
    };
}

export default amml;
