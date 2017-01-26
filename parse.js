#!/usr/bin/env nodejs

var fs = require('fs');
var chunk = fs.readFileSync("knm-08.spc"); // zna-25 ykc-b06
var entryAddr = 0x1CAB;
var note = "C C# D D# E F F# G G# A A# B".split(" ");
var smw = true;
var smwlog = "";
var smwOctave = 4;
var smwNote = "c c+ d d+ e f f+ g g+ a a+ b".split(" ");

var se = entryAddr + 256;
var channelAddr = [];
var results = "";
var transpose1 = 0;
var transpose2 = 0;

trace = function (info) {
    results += info + "\r\n";
    console.log(info);
}

smwl = function (info) {
    if (smw) {
        smwlog += info;
    }
}

shownote = function (n) {
    if (n == 0x56) {
        return "Tie";
    } else if (n == 0x55) {
        return "Rest";
    } else {
        n0 = n + transpose1 + transpose2;
        octave = Math.ceil(n0 / 12);
        musicNote = n0 % 12;
        var diff = musicNote - smwOctave;
        if (diff < 0) {
            for (i = 0; i < (0 - diff); i++) {
                smwl("< ");
            }
        } else if (diff > 0) {
            for (i = 0; i < diff; i++) {
                smwl("> ");
            }
        } else {
        }
        smwl(smwNote[musicNote]);
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
    trace("[" + index + "] Panpot, Balance: " + (pan2 - 10) + (reserveL ? ", Reserved L" : "") + (reserveR ? ", Reserved R" : ""));
}

VCMDvibrato = function (index, arg1, arg2) {
    var delay = Math.floor(arg1 / 16);
    var rate = arg1 % 16;
    var depth = arg2;
    trace("[" + index + "] Vibrato, Delay: " + delay + " ticks, Rate: " + rate + ", Depth: " + depth);
}

VCMDglobalVolume = function (index, arg1) {
    trace("[" + index + "] Global Volume, " + arg1 + " (" + (Math.round(arg1 / 256 * 10000) / 100) + "%)");
}

VCMDtempo = function (index, arg1) {
    trace("[" + index + "] Tempo, " + arg1 + " (" + Math.round(arg1 / 0.4) + " BPM)");
}

VCMDglobalTranspose = function (index, arg1) {
    transpose1 = (arg1 > 127) ? (arg1 - 256) : arg1;
    trace("[" + index + "] Global Transpose, " + transpose1);
}

VCMDsetADSR = function (index, arg1, arg2) {
    var adsr1 = arg1 % 16;
    var adsr2 = Math.floor(arg1 / 16);
    var adsr3 = Math.floor(arg2 / 32);
    var adsr4 = arg2 % 32;
    trace("[" + index + "] ADSR, Param: " + adsr1 + ", " + adsr2 + ", " + adsr3 + ", " + adsr4);
}

VCMDlocalVolume = function (index, arg1, arg2) {
    trace("[" + index + "] Local Volume, arg1 (Unused?): " + arg1 + ", Volume: " + arg2 + " (" + (Math.round(arg1 / 256 * 10000) / 100) + "%)");
}

VCMDportamento = function (index, arg1, arg2) {
    trace("[" + index + "] Portamento, Delay: " + arg1 + " ticks, Speed: " + arg2);
}

VCMDechoVolume = function (index, arg1, arg2) {
    var left  = (arg1 > 127) ? (arg1 - 256) : arg1;
    var right = (arg2 > 127) ? (arg2 - 256) : arg2;
    trace("[" + index + "] Echo Volume, L: " + left + ", R: " + right);
}

VCMDechoEnabled = function (index, arg1) {
    var echo = arg1.toString(2);
    while (echo.length < 8) {
        echo = "0" + echo;
    }
    trace("[" + index + "] Echo Enabled, %" + echo);
}

VCMDcutLength = function (index, arg1, arg2) {
    trace("[" + index + "] Rate before note cut, Length 1: " + arg2 + ", Length 2: " + arg1);
}

VCMDslurNote = function (index, arg1, arg2) {
    trace("[" + index + "] Note " + shownote(arg1) + " (Slured), Length: " + arg2 + " ticks");
}

VCMDaltNote = function (index, arg1, arg2) {
    trace("[" + index + "] Note " + shownote(arg1) + " (Length 2), Length: " + arg2 + " ticks");
}

VCMDloopStart = function (index) {
    trace("[" + index + "] Loop Start");
}

VCMDloopBreak = function (index, arg1) {
    trace("[" + index + "] Loop Break, " + arg1 + " times");
}

VCMDunknown1 = function (index, arg0) {
    trace("[" + index + "] Unknown Command (" + arg0.toString(16) + ")");
}

VCMDunknown2 = function (index, arg0, arg1) {
    trace("[" + index + "] Unknown Command (" + arg0.toString(16) + ", " + arg1.toString(16) + ")");
}

VCMDunknown3 = function (index, arg0, arg1, arg2) {
    trace("[" + index + "] Unknown Command (" + arg0.toString(16) + ", " + arg1.toString(16) + ", " + arg2.toString(16) + ")");
}

VCMDunknown4 = function (index, arg0, arg1, arg2, arg3) {
    trace("[" + index + "] Unknown Command (" + arg0.toString(16) + ", " + arg1.toString(16) + ", " + arg2.toString(16) + ", " + arg3.toString(16) + ")");
}

for (i = 0; i < 8; i++) {
    channelAddr[i] = chunk.readUInt16LE(se + i * 2) + 256;
    trace("Channel " + i + " Entry: " + channelAddr[i]);
}

for (j = 0; j < 8; j++) {
    trace("");
    trace("[ ================ Channel " + j + " ================ ]");
    trace("");
    var i = channelAddr[j];
    var isEnd = false;
    if (i != 0) {
        smwl("#" + j + "\r\n");
        while (!isEnd) {
            if (chunk[i] <= 0x56) {
               trace("[" + i + "] Note " + shownote(chunk[i]) + ", Length: " + chunk[i + 1] + " ticks");
               if ((192 % chunk[i + 1]) == 0) {
                    smwl(192 / chunk[i + 1] + " ");
                } else {
                    smwl("=" + chunk[i + 1] + " ");
                }
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
                    VCMDunknown3(i, chunk[i], chunk[i + 1], chunk[i + 2]);
                    i += 3;
                    break;
                case 0xE3:                    // VIBRATO
                    VCMDvibrato(i, chunk[i + 1], chunk[i + 2]);
                    i += 3;
                    break;
                case 0xE4:                    // 
                    VCMDunknown1(i, chunk[i]);
                    i += 1;
                    break;
                case 0xE5:                    // GLOBAL VOL
                    VCMDglobalVolume(i, chunk[i + 1]);
                    i += 2;
                    break;
                case 0xE6:                    // 
                    VCMDunknown3(i, chunk[i], chunk[i + 1], chunk[i + 2]);
                    i += 3;
                    break;
                case 0xE7:                    // TEMPO
                    VCMDtempo(i, chunk[i + 1]);
                    i += 2;
                    break;
                case 0xE8:                    // 
                    VCMDunknown3(i, chunk[i], chunk[i + 1], chunk[i + 2]);
                    i += 3;
                    break;
                case 0xE9:                    // SET GLOBAL TRANSPOSE
                    VCMDglobalTranspose(i, chunk[i+1]);
                    i += 2;
                    break;
                case 0xEA:                    // 
                    VCMDunknown2(i, chunk[i], chunk[i + 1]);
                    i += 2;
                    break;
                case 0xEB:                    // SET ADSR
                    VCMDsetADSR(i, chunk[i + 1], chunk[i + 2]);
                    i += 3;
                    break;
                case 0xEC:                    // 
                    VCMDunknown3(i, chunk[i], chunk[i + 1], chunk[i + 2]);
                    i += 3;
                    break;
                case 0xED:                    // LOCAL VOLUME
                    VCMDlocalVolume(i, chunk[i + 1], chunk[i + 2]);
                    i += 3;
                    break;
                case 0xEE:                    // 
                    VCMDunknown3(i, chunk[i], chunk[i + 1], chunk[i + 2]);
                    i += 3;
                    break;
                case 0xEF:                    // 
                    VCMDunknown1(i, chunk[i]);
                    i += 1;
                    break;
                case 0xF0:                    // PORTAMENTO
                    VCMDportamento(i, chunk[i + 1], chunk[i + 2]);
                    i += 3;
                    break;
                case 0xF1:                    // ECHO VOL
                    VCMDechoVolume(i, chunk[i + 1], chunk[i + 2]);
                    i += 3;
                    break;
                case 0xF2:                    // ECHO ENABLED
                    VCMDechoEnabled(i, chunk[i + 1]);
                    i += 2;
                    break;
                case 0xF3:                    // 
                    VCMDunknown4(i, chunk[i], chunk[i + 1], chunk[i + 2], chunk[i + 3]);
                    i += 4;
                    break;
                case 0xF4:                    // RATE BEFORE NOTE CUT
                    VCMDcutLength(i, chunk[i + 1], chunk[i + 2]);
                    i += 3;
                    break;
                case 0xF5:                    // 
                    VCMDunknown1(i, chunk[i]);
                    i += 1;
                    break;
                case 0xF6:                    // 
                    VCMDunknown1(i, chunk[i]);
                    i += 1;
                    break;
                case 0xF7:                    // 
                    VCMDunknown1(i, chunk[i]);
                    i += 1;
                    break;
                case 0xF8:                    // 
                    VCMDunknown1(i, chunk[i]);
                    i += 1;
                    break;
                case 0xF9:                    // SLUR NOTE
                    VCMDslurNote(i, chunk[i + 1], chunk[i + 2]);
                    i += 3;
                    break;
                case 0xFA:                    // NOTE USING ALT CUT RATE
                    VCMDaltNote(i, chunk[i + 1], chunk[i + 2]);
                    i += 3;
                    break;
                case 0xFB:                    // LOOP START
                    VCMDloopStart(i);
                    i += 1;
                    break;
                case 0xFC:                    // JUMP
                    trace("[" + i + "] Jump into " + (chunk.readUInt16LE(i + 1) + 256));
                    isEnd = true;
                    break;
                case 0xFD:                    // 
                    VCMDunknown2(i, chunk[i], chunk[i + 1], chunk[i + 2]);
                    i += 3;
                    break;
                case 0xFE:                    // LOOP STOP
                    VCMDloopBreak(i, chunk[i + 1]);
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
