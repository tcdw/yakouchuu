const notes = ['c', 'c+', 'd', 'd+', 'e', 'f', 'f+', 'g', 'g+', 'a', 'a+', 'b'];

function amml(ast, absTick) {
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
        for (let j = 0; j < cSeq.length; j += 1) {
            const item = cSeq[j];
            if ((item[0] > 0 && item[0] <= 0x56) || item[0] === 0xF9 || item[0] === 0xFA) {
                const isSlur = item[0] === 0xF9;
                const isAlt = item[0] === 0xFA;
                const off = (isSlur || isAlt) ? 1 : 0;
                const note = item[off] - 1;
                const len = item[off + 1] & 0x7F;
                volumePrev = volumeNow;
                volumeNow = len >= 0x80 ? volumeA : volumeB;
                if (volumePrev !== volumeNow) {
                    chan.push(`v${volumeNow} `);
                }
                lenRatePrev = lenRateNow;
                lenRateNow = isAlt ? lenRateA : lenRateB;
                if (lenRatePrev !== lenRateNow) {
                    chan.push(`q${lenRateNow}f `);
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
            }
        }
        channels[i] = chan.join('');
        console.log(channels[i]);
    }
}

module.exports = amml;
