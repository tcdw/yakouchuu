declare module 'json-beautify' {
    type Replacer = ((this: unknown, key: string, value: unknown) => unknown) | null;
    function beautify(value: unknown, replacer: Replacer, space: number, limit?: number): string;
    export = beautify;
}
