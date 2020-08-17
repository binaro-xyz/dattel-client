const bent = require('bent');
const glob = require('glob');
const hasha = require('hasha');
const { addedDiff, deletedDiff, updatedDiff } = require('deep-object-diff');
const { parseHeadersFile } = require('./lib/headers');
const { parseRedirectsFile } = require('./lib/redirects');
const fs = require('fs');
const path = require('path');

const debug = (...args) => {
    if (process.env.DATTEL_DEBUG) console.log(args);
};

module.exports = ({ server_url, auth_token }) => {
    const request = (method) => {
        return function (...args) {
            const func = bent(method, 'json', [200, 201], server_url, {
                Authorization: `Bearer ${auth_token}`,
            });
            if (process.env.DATTEL_DEBUG) {
                return func(...args).catch(async (err) => {
                    console.error('Request failed.', err, [method, ...args]);
                    if (err.json) console.log(await err.json());
                    process.exit(1);
                });
            }
            return func(...args);
        };
    };
    const GET = request('GET');
    const POST = request('POST');
    const PATCH = request('PATCH');
    const PUT = request('PUT');
    const DELETE = request('DELETE');

    const createSite = (site_id, domains) => PUT('/site', { site_id, domains });
    const deleteSite = (site_id, delete_token = undefined) => DELETE(`/site/${site_id}`, { delete_token });
    const setSiteHeaders = (site_id, headers = {}, redirects = []) =>
        PATCH(`/site/${site_id}/headers`, { headers, redirects });
    const setSiteHeadersFromFile = async (site_id, headers_file, redirects_file) =>
        setSiteHeaders(site_id, parseHeadersFile(headers_file), await parseRedirectsFile(redirects_file));

    const startDeploy = (site_id) => PUT(`/site/${site_id}/deploy`);
    const cancelDeploy = (site_id) => DELETE(`/site/${site_id}/deploy`);
    const uploadDeployFile = (site_id, deploy_id, dest_path, in_path) =>
        PUT(`/site/${site_id}/deploy/${deploy_id}/file/${dest_path}`, fs.readFileSync(in_path));
    const deleteDeployFile = (site_id, deploy_id, dest_path) =>
        DELETE(`/site/${site_id}/deploy/${deploy_id}/file/${dest_path}`);
    const deployDirectory = (site_id, deploy_id, remote_file_info, local_dir) => {
        // TODO: This was just copied from the server. Ideally, they could share this code somehow.
        const files = glob.sync('**/*', { cwd: local_dir, dot: true, nodir: true }).reduce(
            (acc, cur) => ({
                ...acc,
                [cur]: hasha.fromFileSync(path.join(local_dir, cur), { algorithm: 'md5' }),
            }),
            {}
        );

        const delete_files = Object.keys(deletedDiff(remote_file_info, files)).map((f) =>
            deleteDeployFile(site_id, deploy_id, f)
        );
        const upload_files = [
            ...Object.keys(addedDiff(remote_file_info, files)),
            ...Object.keys(updatedDiff(remote_file_info, files)),
        ].map((f) => uploadDeployFile(site_id, deploy_id, f, path.join(local_dir, f)));

        return Promise.all([...delete_files, ...upload_files]);
    };
    const publishDeploy = (site_id, deploy_id) => POST(`/site/${site_id}/deploy/${deploy_id}/publish`);

    return {
        raw: request,

        createSite,
        deleteSite,
        setSiteHeaders,
        setSiteHeadersFromFile,
        startDeploy,
        cancelDeploy,
        uploadDeployFile,
        deleteDeployFile,
        deployDirectory,
        publishDeploy,
    };
};
