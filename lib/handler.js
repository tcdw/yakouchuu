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
