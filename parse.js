#!/usr/bin/env nodejs

const fs = require('fs');

const chunk = fs.readFileSync('ykc-08.spc');
const entryAddr = 0x1CAB;
const note = 'C C# D D# E F F# G G# A A# B'.split(' ');
const smw = true;
let smwlog = '';
let smwOctave = 4;
const smwNote = 'c c+ d d+ e f f+ g g+ a a+ b'.split(' ');

const se = entryAddr + 256;
const channelAddr = [];
let results = '';
let transpose1 = 0;
const transpose2 = 0;

const trace = (info) => {
    results += `${info}\r\n`;
    console.log(info);
};

const smwl = (info) => {
    if (smw) {
        smwlog += info;
    }
};

const shownote = (n) => {
    if (n === 0x56) {
        smwl('^');
        return 'Tie';
    } if (n === 0x55) {
        smwl('r');
        return 'Rest';
    }
    const n0 = n + transpose1 + transpose2;
    const octave = Math.ceil(n0 / 12);
    const musicNote = n0 % 12;
    const diff = octave - smwOctave;
    if (diff < 0) {
        for (let k = 0; k < (0 - diff); k += 1) {
            smwl('< ');
        }
    } else if (diff > 0) {
        for (let k = 0; k < diff; k += 1) {
            smwl('> ');
        }
    }
    smwOctave = octave;
    smwl(smwNote[musicNote]);
    return `${note[musicNote]}${octave}`;
};

const VCMDsetInstrument = (index, inst) => {
    trace(`[${index}] Instrument, Patch ${inst}`);
    smwl(`PATCH${inst} `);
};

const VCMDpanpot = (index, pan) => {
    let reserveL = false;
    let reserveR = false;
    let pan2 = 0;
    if (pan >= 0x40 && pan < 0x80) {
        pan2 = pan - 0x40;
        reserveR = true;
    } else if (pan >= 0x80 && pan < 0xC0) {
        reserveL = true;
        pan2 = pan - 0x80;
    } else if (pan >= 0xC0) {
        reserveL = true;
        reserveR = true;
        pan2 = pan - 0xC0;
    } else {
        pan2 = pan;
    }
    trace(`[${index}] Panpot, Balance: ${pan2 - 10}${reserveL ? ', Reserved L' : ''}${reserveR ? ', Reserved R' : ''}`);
    if (pan < 16) {
        smwl(`$DB $0${pan.toString(16)}`);
    } else {
        smwl(`$DB $${pan.toString(16)}`);
    }
};

const VCMDvibrato = (index, arg1, arg2) => {
    const delay = Math.floor(arg1 / 16);
    const rate = arg1 % 16;
    const depth = arg2;
    trace(`[${index}] Vibrato, Delay: ${delay} ticks, Rate: ${rate}, Depth: ${depth}`);
};

const VCMDglobalVolume = (index, arg1) => {
    trace(`[${index}] Global Volume, ${arg1} (${Math.round(arg1 / 256 * 10000) / 100}%)`);
    smwl(`w${arg1}\r\n`);
};

const VCMDtempo = (index, arg1) => {
    trace(`[${index}] Tempo, ${arg1} (${Math.round(arg1 / 0.4)} BPM)`);
    smwl(`t${arg1}\r\n`);
};

const VCMDglobalTranspose = (index, arg1) => {
    transpose1 = (arg1 > 127) ? (arg1 - 256) : arg1;
    trace(`[${index}] Global Transpose, ${transpose1}`);
};

const VCMDsetADSR = (index, arg1, arg2) => {
    const adsr1 = arg1 % 16;
    const adsr2 = Math.floor(arg1 / 16);
    const adsr3 = Math.floor(arg2 / 32);
    const adsr4 = arg2 % 32;
    trace(`[${index}] ADSR, Param: ${adsr1}, ${adsr2}, ${adsr3}, ${adsr4}`);
};

const VCMDlocalVolume = (index, arg1, arg2) => {
    trace(`[${index}] Local Volume, arg1 (Unused?): ${arg1}, Volume: ${arg2} (${Math.round(arg2 / 256 * 10000) / 100}%)`);
    smwl(`v${arg2}\r\n`);
};

const VCMDportamento = (index, arg1, arg2) => {
    trace(`[${index}] Portamento, Delay: ${arg1} ticks, Speed: ${arg2}`);
};

const VCMDechoVolume = (index, arg1, arg2) => {
    const left = (arg1 > 127) ? (arg1 - 256) : arg1;
    const right = (arg2 > 127) ? (arg2 - 256) : arg2;
    trace(`[${index}] Echo Volume, L: ${left}, R: ${right}`);
};

const VCMDechoEnabled = (index, arg1) => {
    let echo = arg1.toString(2);
    while (echo.length < 8) {
        echo = `0${echo}`;
    }
    trace(`[${index}] Echo Enabled, %${echo}`);
};

const VCMDcutLength = (index, arg1, arg2) => {
    trace(`[${index}] Rate before note cut, Length 1: ${arg2}, Length 2: ${arg1}`);
};

const VCMDslurNote = (index, arg1, arg2) => {
    trace(`[${index}] Note ${shownote(arg1)} (Slured), Length: ${arg2} ticks`);
    if ((192 % arg2) === 0) {
        smwl(`${192 / arg2}    ; SLURED!\r\n`);
    } else {
        smwl(`=${arg2}    ; SLURED!\r\n`);
    }
};

const VCMDaltNote = (index, arg1, arg2) => {
    trace(`[${index}] Note ${shownote(arg1)} (Length 2), Length: ${arg2} ticks`);
    if ((192 % arg2) === 0) {
        smwl(`${192 / arg2}    ; ALT LENGTH!\r\n`);
    } else {
        smwl(`=${arg2}    ; ALT LENGTH!\r\n`);
    }
};

const VCMDloopStart = (index) => {
    trace(`[${index}] Loop Start`);
    smwl('[\r\n');
};

const VCMDloopBreak = (index, arg1) => {
    trace(`[${index}] Loop Break, ${arg1} times`);
    smwl(`]${arg1}\r\n`);
};

const VCMDunknown1 = (index, arg0) => {
    trace(`[${index}] Unknown Command (${arg0.toString(16)})`);
};

const VCMDunknown2 = (index, arg0, arg1) => {
    trace(`[${index}] Unknown Command (${arg0.toString(16)}, ${arg1.toString(16)})`);
};

const VCMDunknown3 = (index, arg0, arg1, arg2) => {
    trace(`[${index}] Unknown Command (${arg0.toString(16)}, ${arg1.toString(16)}, ${arg2.toString(16)})`);
};

const VCMDunknown4 = (index, arg0, arg1, arg2, arg3) => {
    trace(`[${index}] Unknown Command (${arg0.toString(16)}, ${arg1.toString(16)}, ${arg2.toString(16)}, ${arg3.toString(16)})`);
};

for (let i = 0; i < 8; i += 1) {
    channelAddr[i] = chunk.readUInt16LE(se + i * 2) + 256;
    trace(`Channel ${i} Entry: ${channelAddr[i]}`);
}

for (let j = 0; j < 8; j += 1) {
    trace('');
    trace(`[ ================ Channel ${j} ================ ]`);
    trace('');
    let i = channelAddr[j];
    let isEnd = false;
    smwOctave = 4;
    if (i !== 0) {
        smwl(`\r\n#${j} o4\r\n`);
        while (!isEnd) {
            if (chunk[i] <= 0x56) {
                trace(`[${i}] Note ${shownote(chunk[i])}, Length: ${chunk[i + 1]} ticks`);
                if ((192 % chunk[i + 1]) === 0) {
                    smwl(`${192 / chunk[i + 1]} `);
                } else {
                    smwl(`=${chunk[i + 1]} `);
                }
                i += 2;
            } else if (chunk[i] >= 0xE0 && chunk[i] <= 0xFF) {
                switch (chunk[i]) {
                    case 0xE0: // SET INSTRUMENT
                        VCMDsetInstrument(i, chunk[i + 1]);
                        i += 2;
                        break;
                    case 0xE1: // PANPOT
                        VCMDpanpot(i, chunk[i + 1]);
                        i += 2;
                        break;
                    case 0xE2: //
                        VCMDunknown3(i, chunk[i], chunk[i + 1], chunk[i + 2]);
                        i += 3;
                        break;
                    case 0xE3: // VIBRATO
                        VCMDvibrato(i, chunk[i + 1], chunk[i + 2]);
                        i += 3;
                        break;
                    case 0xE4: //
                        VCMDunknown1(i, chunk[i]);
                        i += 1;
                        break;
                    case 0xE5: // GLOBAL VOL
                        VCMDglobalVolume(i, chunk[i + 1]);
                        i += 2;
                        break;
                    case 0xE6: //
                        VCMDunknown3(i, chunk[i], chunk[i + 1], chunk[i + 2]);
                        i += 3;
                        break;
                    case 0xE7: // TEMPO
                        VCMDtempo(i, chunk[i + 1]);
                        i += 2;
                        break;
                    case 0xE8: //
                        VCMDunknown3(i, chunk[i], chunk[i + 1], chunk[i + 2]);
                        i += 3;
                        break;
                    case 0xE9: // SET GLOBAL TRANSPOSE
                        VCMDglobalTranspose(i, chunk[i + 1]);
                        i += 2;
                        break;
                    case 0xEA: //
                        VCMDunknown2(i, chunk[i], chunk[i + 1]);
                        i += 2;
                        break;
                    case 0xEB: // SET ADSR
                        VCMDsetADSR(i, chunk[i + 1], chunk[i + 2]);
                        i += 3;
                        break;
                    case 0xEC: //
                        VCMDunknown3(i, chunk[i], chunk[i + 1], chunk[i + 2]);
                        i += 3;
                        break;
                    case 0xED: // LOCAL VOLUME
                        VCMDlocalVolume(i, chunk[i + 1], chunk[i + 2]);
                        i += 3;
                        break;
                    case 0xEE: //
                        VCMDunknown3(i, chunk[i], chunk[i + 1], chunk[i + 2]);
                        i += 3;
                        break;
                    case 0xEF: //
                        VCMDunknown1(i, chunk[i]);
                        i += 1;
                        break;
                    case 0xF0: // PORTAMENTO
                        VCMDportamento(i, chunk[i + 1], chunk[i + 2]);
                        i += 3;
                        break;
                    case 0xF1: // ECHO VOL
                        VCMDechoVolume(i, chunk[i + 1], chunk[i + 2]);
                        i += 3;
                        break;
                    case 0xF2: // ECHO ENABLED
                        VCMDechoEnabled(i, chunk[i + 1]);
                        i += 2;
                        break;
                    case 0xF3: //
                        VCMDunknown4(i, chunk[i], chunk[i + 1], chunk[i + 2], chunk[i + 3]);
                        i += 4;
                        break;
                    case 0xF4: // RATE BEFORE NOTE CUT
                        VCMDcutLength(i, chunk[i + 1], chunk[i + 2]);
                        i += 3;
                        break;
                    case 0xF5: //
                        VCMDunknown1(i, chunk[i]);
                        i += 1;
                        break;
                    case 0xF6: //
                        VCMDunknown1(i, chunk[i]);
                        i += 1;
                        break;
                    case 0xF7: //
                        VCMDunknown1(i, chunk[i]);
                        i += 1;
                        break;
                    case 0xF8: //
                        VCMDunknown1(i, chunk[i]);
                        i += 1;
                        break;
                    case 0xF9: // SLUR NOTE
                        VCMDslurNote(i, chunk[i + 1], chunk[i + 2]);
                        i += 3;
                        break;
                    case 0xFA: // NOTE USING ALT CUT RATE
                        VCMDaltNote(i, chunk[i + 1], chunk[i + 2]);
                        i += 3;
                        break;
                    case 0xFB: // LOOP START
                        VCMDloopStart(i);
                        i += 1;
                        break;
                    case 0xFC: // JUMP
                        trace(`[${i}] Jump into ${chunk.readUInt16LE(i + 1) + 256}`);
                        isEnd = true;
                        break;
                    case 0xFD: //
                        VCMDunknown2(i, chunk[i], chunk[i + 1], chunk[i + 2]);
                        i += 3;
                        break;
                    case 0xFE: // LOOP STOP
                        VCMDloopBreak(i, chunk[i + 1]);
                        i += 2;
                        break;
                    case 0xFF: // TRACE STOP
                        trace(`[${i}] Track Stop`);
                        isEnd = true;
                        break;
                    default:
                        break;
                }
            } else {
                trace(`Unable to Handle Command${chunk[i]}`);
                break;
            }
        }
    }
}
if (smw) {
    fs.writeFileSync('results_smw.txt', smwlog);
}
fs.writeFileSync('results.txt', results);
