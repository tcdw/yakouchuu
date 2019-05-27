const { trace8, trace16, pad } = require('./hex_addr');
const printBuffer = require('./print_buffer');

const notes = ['c', 'c+', 'd', 'd+', 'e', 'f', 'f+', 'g', 'g+', 'a', 'a+', 'b'];
const defaultFIR = [
    [0x7F, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    [0x58, 0xBF, 0xDB, 0xF0, 0xFE, 0x07, 0x0C, 0x0C],
    [0x0C, 0x21, 0x2B, 0x2B, 0x13, 0xFE, 0xF3, 0xF9],
    [0x34, 0x33, 0x00, 0xD9, 0xE5, 0x01, 0xFC, 0xEB],
];

function amml(ast, spc, absTick, doubleTrick, superloop) {
    // 改写自 https://github.com/loveemu/spc_converters_legacy/blob/master/nintspc/src/nintspc.c
    function getNoteLenForMML(tick, division) {
        const dotMax = 6;
        const note = division * 4;
        let l;
        let dot;
        let text = '';
        if (!absTick) {
            for (l = 1; l <= note; l += 1) {
                let cTick = 0;
                for (dot = 0; dot <= dotMax; dot += 1) {
                    const ld = (l << dot);
                    if (note % ld) {
                        break;
                    }
                    cTick += note / ld;
                    if (tick === cTick) {
                        text += l;
                        for (; dot > 0; dot -= 1) {
                            text += '.';
                        }
                        return text;
                    }
                }
            }
        }
        return `=${tick}`;
    }

    const channels = [];
    const patches = [];
    for (let i = 0; i < 8; i += 1) {
        const cSeq = ast.sequences[i];
        const chan = [`#${i}\n`];
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
                let len = (item[off + 1] & 0x7F) * doubleTrick;
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

                // 连音吗？
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
                        chan.join(`\n; ###### ${warnStr}\n`);
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
                noteStr += getNoteLenForMML(len, 48);
                chan.push(`${noteStr} `);
                lastNote = chan.length - 1;

                // 对于 slur 状态结束时的处理（追加 $F4 $01 并使用连音符号补充长度）
                if (len !== fullLen) {
                    const restLen = fullLen - len;
                    chan.push(`$F4 $01 ^${getNoteLenForMML(restLen, 48)} `);
                }
                continue;
            }
            switch (item[0]) {
                // set instrument
                case 0xE0: {
                    if (patches.indexOf(item[1]) < 0) {
                        patches.push(item[1]);
                    }
                    chan.push(`\nPATCH${pad(item[1], 3)} `);
                    break;
                }
                // set panpot
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
                // set vibrato
                case 0xE3: {
                    chan.push(`\n; ★ Vibrato: ${printBuffer(item)}\n`);
                    break;
                }
                // set gvolume
                case 0xE5: {
                    chan.push(`w${item[1]} `);
                    break;
                }
                // set tempo
                case 0xE7: {
                    chan.push(`t${item[1] * doubleTrick} `);
                    break;
                }
                // set global trans
                case 0xE9: {
                    chan.push(`$E4 ${trace8(item[1])} `);
                    break;
                }
                // set local trans
                case 0xEA: {
                    chan.push(`$FA $02 ${trace8(item[1])} `);
                    break;
                }
                // set ADSR
                case 0xEB: {
                    chan.push(`$ED ${trace8(item[1])} ${trace8(item[2])} `);
                    break;
                }
                // set volume
                case 0xED: {
                    volumeA = item[1];
                    volumeB = item[2];
                    break;
                }
                // set portamento
                case 0xF0: {
                    chan.push(`\n; ★ Portamento: ${printBuffer(item)}\n`);
                    break;
                }
                // set echo vol
                case 0xF1: {
                    const rawL = Buffer.prototype.readInt8.call(item, 1);
                    const rawR = Buffer.prototype.readInt8.call(item, 2);
                    echoVolumeL = Math.round(rawL / spc[0x1010C] * 127);
                    echoVolumeR = Math.round(rawR / spc[0x1011C] * 127);
                    const eofStr = 'Warning: Echo volume overflow';
                    if (echoVolumeL > 127) {
                        console.warn(eofStr);
                        echoVolumeL = 127;
                    }
                    if (echoVolumeR > 127) {
                        console.warn(eofStr);
                        echoVolumeR = 127;
                    }
                    if (echoVolumeL < -128) {
                        console.warn(eofStr);
                        echoVolumeL = -128;
                    }
                    if (echoVolumeR < -128) {
                        console.warn(eofStr);
                        echoVolumeR = -128;
                    }
                    if (echoVolumeL < 0) echoVolumeL = 256 + echoVolumeL;
                    if (echoVolumeR < 0) echoVolumeR = 256 + echoVolumeR;
                    chan.push(`\n$EF ${trace8(echoEnabled)} ${trace8(echoVolumeL)} ${trace8(echoVolumeR)} \n`);
                    break;
                }
                // set echo enabled
                case 0xF2: {
                    echoEnabled = item[1];
                    chan.push(`\n$EF ${trace8(echoEnabled)} ${trace8(echoVolumeL)} ${trace8(echoVolumeR)} \n`);
                    break;
                }
                // set len rate
                case 0xF4: {
                    lenRateA = item[1];
                    lenRateB = item[2];
                    break;
                }
                // loop start
                case 0xFB: {
                    chan.push(superloop ? '\n[[' : '\n[');
                    inBucketState = true;
                    break;
                }
                // loop end
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
        while (channels[i].indexOf('\n\n') >= 0) {
            channels[i] = channels[i].split('\n\n').join('\n');
        }
    }
    return {
        channels,
        patches,
    };
}

module.exports = amml;
