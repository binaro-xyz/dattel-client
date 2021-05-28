import { parseRedirectsFormat, Redirect } from 'netlify-redirect-parser';
import { existsSync } from 'fs'; // For some reason, `fs/promises` doesn't have `exists`?!

export const parseRedirectsFile = async (file_path: string): Promise<Redirect[]> => {
    if (!existsSync(file_path)) return [];
    const netlify_redirects = await parseRedirectsFormat(file_path);
    if (netlify_redirects.errors.length !== 0) {
        console.error(netlify_redirects.errors);
        throw new Error('Error parsing the redirects.');
    }

    // We only support a subset of the features of the Netlify redirects format (at least for the moment). Notable
    // differences:
    // * We don't support custom error pages yet. These will be implemented but probably not via the redirects.
    // * The `force` directive is completely ignored.
    // * Caddy can't match different matcher sets (like host, scheme, path) using AND but will instead OR them (see:
    //   https://caddyserver.com/docs/json/apps/http/servers/routes/match/#docs). Thus, we only allow one of them to be
    //   set per redirect.
    // * We don't do any scheme-based redirections. Caddy will automatically redirect all HTTP traffic to HTTPS.
    // * We don't support any of the advanced features like placeholders and query parameters.
    // * We don't and likely never will support geo- or role-based redirects.
    // * We don't support rewrites.
    const redirects = netlify_redirects.success.map((r) => {
        if (r.status && !/^3\d\d$/.test('' + r.status)) throw new Error('Only 3xx status code are allowed.');

        if (r.host) {
            if (r.path && r.path !== '/*') throw new Error('Cannot use redirect with both host and path set.');

            return { status: r.status || 301, host: r.host, to: r.to };
        }

        return { status: 301, ...r };
    });

    return redirects;
};
export { Redirect } from 'netlify-redirect-parser';
