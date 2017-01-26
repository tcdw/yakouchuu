#!/usr/bin/env nodejs

var fs = require('fs');
var chunk = fs.readFileSync("ykc-b06.spc");
var entryAddr = 0x1CAB;
var note = "C C# D D# E F F# G G# A A# B".split(" ");
/**********************************************************************************/

var se = entryAddr + 256;
var channelAddr = [];
var results = "";

trace = function (info) {
    results += info + "\r\n";
    console.log(info);
}

/********************************** VCMD Handler **********************************/

shownote = function (n) {
    if (n == 0x56) {
        return "Tie";
    } else if (n == 0x55) {
        return "Rest";
    } else {
        octave = Math.ceil(n / 12);
        musicNote = n % 12;
        return note[musicNote] + "" + octave;
    }
}

VCMDsetInstrument = function (index, inst) {
    trace("[" + index + "] Instrument, Patch " + inst);
}

VCMDpanpot = function (index, pan) {
    var reserveL = false;
    var reserveR = false;
    var pan2 = 0;
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
    trace("[" + index + "] Panpot, Balance " + (pan2 - 10) + (reserveL ? ", Reserved L" : "") + (reserveR ? ", Reserved R" : ""));
}

VCMDvibrato = function (index, arg1, arg2) {
    var delay = Math.floor(arg1 / 16);
    var rate = arg1 % 16;
    var depth = arg2;
    trace("[" + index + "] Vibrato, Delay " + delay + ", Rate " + rate + ", Depth " + depth);
}

VCMDglobalVolume = function (index, arg1) {
    trace("[" + index + "] Global Volume, " + arg1 + " (" + (Math.round(arg1 / 256 * 10000) / 100) + "%)");
}

VCMDtempo = function (index, arg1) {
    trace("[" + index + "] Tempo, " + arg1 + " (" + Math.round(arg1 / 0.4) + " BPM)");
}

VCMDunknown = function (index, l) {
    trace("[" + index + "] Unknown Command (Length " + l + ")");
}

for (i = 0; i < 8; i++) {
    channelAddr[i] = chunk.readUInt16LE(se + i * 2);
    trace("Channel " + i + " Entry: " + channelAddr[i]);
}

for (j = 0; j < 8; j++) {
    trace("");
    trace("[ ================ Channel " + j + " ================ ]");
    trace("");
    var i = channelAddr[j] + 256;
    var isEnd = false;
    if (i != 0) {
        while (!isEnd) {
            if (chunk[i] <= 0x56) {
               trace("[" + i + "] Note " + shownote(chunk[i]) + ", Length " + chunk[i + 1]);
               i += 2;
            } else if (chunk[i] >= 0xE0 && chunk[i] <= 0xFF) {
                switch (chunk[i]) {
                case 0xE0:                    // SET INSTRUMENT
                    VCMDsetInstrument(i, chunk[i + 1]);
                    i += 2;
                    break;
                case 0xE1:                    // PANPOT
                    VCMDpanpot(i, chunk[i + 1]);
                    i += 2;
                    break;
                case 0xE2:                    // 
                    VCMDunknown(i, 2);
                    i += 3;
                    break;
                case 0xE3:                    // VIBRATO
                    VCMDvibrato(i, chunk[i + 1], chunk[i + 2]);
                    i += 3;
                    break;
                case 0xE4:                    // 
                    VCMDunknown(i, 0);
                    i += 1;
                    break;
                case 0xE5:                    // GLOBAL VOL
                    VCMDglobalVolume(i, chunk[i + 1]);
                    i += 2;
                    break;
                case 0xE6:                    // 
                    VCMDunknown(i, 2);
                    i += 3;
                    break;
                case 0xE7:                    // TEMPO
                    VCMDtempo(i, chunk[i + 1]);
                    i += 2;
                    break;
                case 0xE8:                    // 
                    VCMDunknown(i, 2);
                    i += 3;
                    break;
                case 0xE9:                    // 
                    VCMDunknown(i, 1);
                    i += 2;
                    break;
                case 0xEA:                    // 
                    VCMDunknown(i, 1);
                    i += 2;
                    break;
                case 0xEB:                    // 
                    VCMDunknown(i, 2);
                    i += 3;
                    break;
                case 0xEC:                    // 
                    VCMDunknown(i, 2);
                    i += 3;
                    break;
                case 0xED:                    // LOCAL VOLUME
                    VCMDunknown(i, 2);
                    i += 3;
                    break;
                case 0xEE:                    // 
                    VCMDunknown(i, 2);
                    i += 3;
                    break;
                case 0xEF:                    // 
                    VCMDunknown(i, 0);
                    i += 1;
                    break;
                case 0xF0:                    // PORTAMENTO
                    VCMDunknown(i, 2);
                    i += 3;
                    break;
                case 0xF1:                    // ECHO VOL
                    VCMDunknown(i, 2);
                    i += 3;
                    break;
                case 0xF2:                    // ECHO ENABLED
                    VCMDunknown(i, 1);
                    i += 2;
                    break;
                case 0xF3:                    // 
                    VCMDunknown(i, 3);
                    i += 4;
                    break;
                case 0xF4:                    // RATE BEFORE NOTE CUT
                    VCMDunknown(i, 2);
                    i += 3;
                    break;
                case 0xF5:                    // 
                    VCMDunknown(i, 0);
                    i += 1;
                    break;
                case 0xF6:                    // 
                    VCMDunknown(i, 0);
                    i += 1;
                    break;
                case 0xF7:                    // 
                    VCMDunknown(i, 0);
                    i += 1;
                    break;
                case 0xF8:                    // 
                    VCMDunknown(i, 0);
                    i += 1;
                    break;
                case 0xF9:                    // SLUR NOTE
                    VCMDunknown(i, 2);
                    i += 3;
                    break;
                case 0xFA:                    // NOTE USING ALT CUT RATE
                    VCMDunknown(i, 2);
                    i += 3;
                    break;
                case 0xFB:                    // LOOP START
                    VCMDunknown(i, 0);
                    i += 1;
                    break;
                case 0xFC:                    // JUMP
                    trace("[" + i + "] Jump into " + chunk.readUInt16LE(i + 1));
                    isEnd = true;
                    break;
                case 0xFD:                    // 
                    VCMDunknown(i, 2);
                    i += 3;
                    break;
                case 0xFE:                    // LOOP STOP
                    VCMDunknown(i, 1);
                    i += 2;
                    break;
                case 0xFF:                    // TRACE STOP
                    trace("[" + i + "] Track Stop");
                    isEnd = true;
                    break;
                }
            } else {
                trace("Unable to Handle Command" + chunk[i]);
                break;
            }
        }
    }
}

fs.writeFileSync("results.txt", results);
