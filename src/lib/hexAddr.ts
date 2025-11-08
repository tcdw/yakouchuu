export const pad = (value: number | string, len: number): string => {
    const upper = String(value).toUpperCase();
    if (upper.length >= len) {
        return upper;
    }
    return '0'.repeat(len - upper.length) + upper;
};

export const trace8 = (num: number): string => `$${pad(num.toString(16), 2)}`;

export const trace16 = (num: number): string => `$${pad(num.toString(16), 4)}`;
