import path from 'path';
import crypto from 'crypto';
import fs from 'fs-extra';
import { pad } from './hexAddr';
import printBuffer from './printBuffer';
import type { ParserResult } from './parser';
import type { AMMLResult } from './amml';

interface BRRInfo {
    name: string;
    brr: Buffer;
}

type BRRMap = Record<number, BRRInfo>;

export type BrrNameMap = Record<string, string>;

const getBRR = (chunk: Buffer, id: number): Buffer => {
    const offset = 0x100;
    const sampleIndexPtr = chunk[0x1015D] * 0x100 + offset;
    const samplePtr = chunk.readUInt16LE(sampleIndexPtr + id * 4);
    const sampleLoop = chunk.readUInt16LE(sampleIndexPtr + id * 4 + 2) - samplePtr;
    let sampleCurrentPtr = samplePtr + offset;
    while (sampleCurrentPtr < (0xFFFF + offset)) {
        sampleCurrentPtr += 9;
        if (chunk[sampleCurrentPtr - 9] % 2 === 1) {
            break;
        }
    }
    const sampleLength = sampleCurrentPtr - (samplePtr + offset);
    const brr = Buffer.alloc(sampleLength + 2);
    brr.writeUInt16LE(sampleLoop);
    chunk.copy(brr, 2, samplePtr + offset, sampleCurrentPtr);
    return brr;
};

function amk(
    result: AMMLResult,
    ast: ParserResult,
    spc: Buffer,
    spcPath: string,
    brrNameMap: BrrNameMap,
): string {
    const txt = result.channels.join('\n\n');
    const spcName = path.parse(spcPath).name;
    const brrs: BRRMap = {};
    const patchOrders = [...result.patches].sort((a, b) => a - b);
    let mmlStr = '';
    let patterns = '';
    mmlStr += '#amk 2\n';
    mmlStr += `#path "${spcName}"\n`;
    mmlStr += '#samples\n{\n';
    fs.mkdirpSync(path.resolve(process.cwd(), `${spcName}`));
    patchOrders.forEach((e) => {
        const brr = getBRR(spc, ast.instruments[e].sample);
        const hash = crypto.createHash('sha256');
        hash.update(brr);
        const brrChecksum = hash.digest('hex');
        const name = typeof brrNameMap[brrChecksum] === 'undefined' ? `h_${brrChecksum}` : brrNameMap[brrChecksum];
        brrs[e] = {
            name,
            brr,
        };
        mmlStr += `\t"${name}.brr"\n`;
        fs.writeFileSync(path.resolve(process.cwd(), `${spcName}`, `${name}.brr`), brr);
    });

    mmlStr += '}\n#instruments\n{\n';
    patchOrders.forEach((e) => {
        const currentInst = Array.from(ast.instruments[e].toNSPC());
        currentInst.splice(0, 1);
        mmlStr += `\t"${brrs[e].name}.brr" ${printBuffer(currentInst)} \n`;
        patterns += `"${brrs[e].name}.brr" ${printBuffer(currentInst)} $A4 $40 $40\n`;
    });
    mmlStr += '}\n#spc\n{';
    let spcAuthor = spc.toString('utf8', 0xB1, 0xD1);
    let spcGame = spc.toString('utf8', 0x4E, 0x6E);
    let spcTitle = spc.toString('utf8', 0x2E, 0x4E);
    if (spcAuthor.indexOf('\0') >= 0) {
        spcAuthor = spcAuthor.slice(0, spcAuthor.indexOf('\0'));
    }
    if (spcGame.indexOf('\0') >= 0) {
        spcGame = spcGame.slice(0, spcGame.indexOf('\0'));
    }
    if (spcTitle.indexOf('\0') >= 0) {
        spcTitle = spcTitle.slice(0, spcTitle.indexOf('\0'));
    }
    const now = new Date();
    mmlStr += `
\t#author    "${spcAuthor}"
\t#game      "${spcGame} / SMW"
\t#comment   "Ported (${now.getFullYear()}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)})"
\t#title     "${spcTitle}"
}
`;
    for (let i = 0; i < patchOrders.length; i += 1) {
        mmlStr += `"PATCH${pad(patchOrders[i], 3)}=@${i + 30}"\n`;
    }
    fs.writeFileSync(path.resolve(process.cwd(), `${spcName}`, '!patterns.txt'), patterns);
    return mmlStr + txt;
}

export default amk;
