const { trace8, trace16 } = require('./hex_addr');

const o = 0x100;
const cmdLen = [
    1, 1, 2, 2, 0, 1, 2, 1, // E0 - E7
    2, 1, 1, 2, 2, 2, 2, 0, // E8 - EF
    2, 2, 1, 3, 2, -1, -1, -1, // F0 - F7
    -1, 2, 2, 0, 2, -1, 1, -1, // F8 - FF
];

class Patch {
    /**
     * @param {number} sample
     * @param {number} da
     * @param {number} sr
     * @param {number} tuning
     */
    constructor(sample, da, sr, tuning) {
        this.sample = sample;
        this.a = da & 0x8F;
        this.d = (da >> 4) & 0x7;
        this.s = sr >> 5;
        this.r = sr & 0x1F;
        this.tuning = tuning;
    }

    toNSPC() {
        const data = Buffer.alloc(6);
        data[0] = this.sample;
        data[1] = this.d * 0x10 + this.a + 0x80;
        data[2] = this.s * 0x20 + this.r;
        data[3] = 0xB8;
        data.writeInt16BE(this.tuning, 4);
        return data;
    }
}

/**
 * @param {Buffer} spc
 * @param {number} entryPtr
 */
function parser(spc, entryPtr) {
    const detailPtr = spc.readInt16LE(o + entryPtr);
    const echoDelay = spc[o + detailPtr];
    const echoFeedback = spc[o + detailPtr + 1];
    const echoFIR = spc[o + detailPtr + 2];
    const instruments = [];
    const instBase = o + detailPtr + 3;
    for (let i = 0; i < 0x18; i += 1) {
        const nowBase = instBase + i * 5;
        instruments.push(new Patch(
            spc[nowBase],
            spc[nowBase + 1],
            spc[nowBase + 2],
            spc.readInt16BE(nowBase + 3),
        ));
    }
    const trackBase = o + entryPtr + 0xAB; // 暂定
    const tracks = [];
    const sequences = [];
    for (let i = 0; i < 8; i += 1) {
        tracks.push(spc.readInt16LE(trackBase + i * 2) + o);
    }
    for (let i = 0; i < 8; i += 1) {
        const content = [];
        let cmdPtr = tracks[i];
        let cont = true;
        while (cont && (spc[cmdPtr] !== 0 || cmdPtr < tracks[i + 1])) {
            if (spc[cmdPtr] > 0 && spc[cmdPtr] <= 0x56) {
                content.push(Array.from(spc.slice(cmdPtr, cmdPtr + 2)));
                cmdPtr += 2;
            } else if (spc[cmdPtr] === 0xFC) {
                const target = spc.readInt16LE(cmdPtr + 1);
                console.log(`${trace16(cmdPtr - o)}: jump to ${trace16(target)}`);
                if ((target + o) > cmdPtr) {
                    cmdPtr = target;
                } else {
                    cont = false;
                }
                break;
            } else if (spc[cmdPtr] >= 0xE0 && spc[cmdPtr] <= 0xFF) {
                const curLen = cmdLen[spc[cmdPtr] - 0xE0];
                if (curLen >= 0) {
                    content.push(Array.from(spc.slice(cmdPtr, cmdPtr + curLen + 1)));
                    cmdPtr += curLen + 1;
                } else {
                    throw Error(`${trace16(cmdPtr - o)}: Unknown command ${trace8(spc[cmdPtr])}! Manual review required!`);
                }
            } else {
                throw Error(`${trace16(cmdPtr - o)}: Unknown command ${trace8(spc[cmdPtr])}! Manual review required!`);
            }
        }
        sequences[i] = content;
    }
    return {
        echoDelay,
        echoFIR,
        echoFeedback,
        instruments,
        tracks,
        sequences,
    };
}

module.exports = parser;
