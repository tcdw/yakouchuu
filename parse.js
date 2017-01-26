#!/usr/bin/env nodejs

var fs = require('fs');
var chunk = fs.readFileSync("knm-08.spc"); // zna-25 ykc-b06
var entryAddr = 0x1CAB;
var note = "C C# D D# E F F# G G# A A# B".split(" ");
var smw = true;
var smwlog = "";
var smwOctave = 4;
var smwNote = "c c+ d d+ e f f+ g g+ a a+ b".split(" ");

/**********************************************************************************/

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
        smwl += info;
    }
}
/********************************** VCMD Handler **********************************/

require("./lib/handler");

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
