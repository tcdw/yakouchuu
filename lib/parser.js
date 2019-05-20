/* eslint-disable no-bitwise */
const o = 0x100;

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
    const instrument = [];
    const instBase = o + detailPtr + 3;
    for (let i = 0; i < 0x18; i += 1) {
        const nowBase = instBase + i * 5;
        instrument.push(new Patch(
            spc[nowBase],
            spc[nowBase + 1],
            spc[nowBase + 2],
            spc.readInt16BE(nowBase + 3),
        ));
    }
}

module.exports = parser;
