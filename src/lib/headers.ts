/*
The code in this file was taken from the netlify/cli project on GitHub (and then typehinted):

https://github.com/netlify/cli/blob/23d290aa67a5eb64ed5909dfa3f222a08dd51e45/src/utils/headers.js

It is available under this license, also reproduced below:

https://github.com/netlify/cli/blob/23d290aa67a5eb64ed5909dfa3f222a08dd51e45/LICENSE

---

Copyright (c) 2016 Netlify <team@netlify.com>

MIT License

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import fs from 'fs';

export type HeaderRules = Record<string, Record<string, string[]>>;

const TOKEN_COMMENT = '#';
const TOKEN_PATH = '/';

export function parseHeadersFile(filePath: string): HeaderRules {
    const rules: HeaderRules = {};
    if (!fs.existsSync(filePath)) return rules;
    if (fs.statSync(filePath).isDirectory()) {
        console.warn('expected _headers file but found a directory at:', filePath);
        return rules;
    }

    const lines = fs.readFileSync(filePath, { encoding: 'utf8' }).split('\n');
    if (lines.length < 1) return rules;

    let path;
    for (let i = 0; i <= lines.length; i++) {
        if (!lines[i]) continue;

        const line = lines[i].trim();

        if (line.startsWith(TOKEN_COMMENT) || line.length < 1) continue;
        if (line.startsWith(TOKEN_PATH)) {
            if (line.includes('*') && line.indexOf('*') !== line.length - 1) {
                throw new Error(
                    `invalid rule (A path rule cannot contain anything after * token) at line: ${i}\n${lines[i]}\n`
                );
            }
            path = line;
            continue;
        }

        if (!path) throw new Error('path should come before headers');

        if (line.includes(':')) {
            const sepIndex = line.indexOf(':');
            if (sepIndex < 1) throw new Error(`invalid header at line: ${i}\n${lines[i]}\n`);

            const key = line.substr(0, sepIndex).trim();
            const value = line.substr(sepIndex + 1).trim();

            if (Object.prototype.hasOwnProperty.call(rules, path)) {
                if (Object.prototype.hasOwnProperty.call(rules[path], key)) {
                    rules[path][key].push(value);
                } else {
                    rules[path][key] = [value];
                }
            } else {
                rules[path] = { [key]: [value] };
            }
        }
    }

    return rules;
}
