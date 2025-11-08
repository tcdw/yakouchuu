import { trace8 } from './hexAddr';

export default function printBuffer(data: ArrayLike<number>): string {
    const parts: string[] = [];
    for (let i = 0; i < data.length; i += 1) {
        parts.push(trace8(data[i]));
    }
    return parts.join(' ');
}
