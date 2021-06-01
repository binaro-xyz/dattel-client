import { attach } from 'retry-axios';
import _axios from 'axios';
import { sync as glob } from 'glob';
import { fromFileSync } from 'hasha';
import { addedDiff, deletedDiff, updatedDiff } from 'deep-object-diff';
import { chunkPromise } from 'chunk-promise';
import { parseHeadersFile, HeaderRules } from './lib/headers';
import { parseRedirectsFile, Redirect } from './lib/redirects';
import { base64Encode } from './lib/util';
import { readFileSync } from 'fs';
import { join } from 'path';

type AxiosReturn<Body> = Promise<{ data: Body }>;
type EmptyServerReturn = { message?: string; statusCode: number };
type ServerReturn<Data extends Record<string, unknown>> = EmptyServerReturn & Data;
type Response<Data extends Record<string, unknown>> = AxiosReturn<ServerReturn<Data>>;
type EmptyResponse = AxiosReturn<EmptyServerReturn>;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default ({ server_url, auth_token }: { server_url: string; auth_token: string }) => {
    const ax = _axios.create({
        baseURL: server_url,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
    });
    ax.defaults.headers.common['Authorization'] = `Bearer ${auth_token}`;
    ax.defaults.raxConfig = {
        instance: ax,
        httpMethodsToRetry: ['GET', 'HEAD', 'OPTIONS', 'DELETE', 'PUT', 'POST', 'PATCH'],
    };
    attach(ax);

    const POST = ax.post;
    const PATCH = ax.patch;
    const PUT = ax.put;
    const DELETE = ax.delete;

    const createSite = (
        site_id: string,
        domains: string[],
        enable_cdn = true,
        bunny_pricing_type: 0 | 1 = 0
    ): EmptyResponse => PUT('/site', { site_id, domains, enable_cdn, bunny_pricing_type });
    const deleteSite = (site_id: string, delete_token?: string): EmptyResponse =>
        DELETE(`/site/${site_id}`, { data: { delete_token } });
    const setSiteHeaders = (site_id: string, headers: HeaderRules = {}, redirects: Redirect[] = []): EmptyResponse =>
        PATCH(`/site/${site_id}/headers`, { headers, redirects });
    const setSiteHeadersFromFile = async (
        site_id: string,
        headers_file?: string | false,
        redirects_file?: string | false
    ): EmptyResponse =>
        setSiteHeaders(
            site_id,
            headers_file ? parseHeadersFile(headers_file) : {},
            redirects_file ? await parseRedirectsFile(redirects_file) : []
        );

    const startDeploy = (site_id: string): Response<{ deploy: { id: string; files: Record<string, string> } }> =>
        PUT(`/site/${site_id}/deploy`);
    const cancelDeploy = (site_id: string): EmptyResponse => DELETE(`/site/${site_id}/deploy`);
    const uploadDeployFile = (site_id: string, deploy_id: string, dest_path: string, in_path: string): EmptyResponse =>
        PUT(`/site/${site_id}/deploy/${deploy_id}/file/${base64Encode(dest_path)}`, readFileSync(in_path));
    const deleteDeployFile = (site_id: string, deploy_id: string, dest_path: string): EmptyResponse =>
        DELETE(`/site/${site_id}/deploy/${deploy_id}/file/${base64Encode(dest_path)}`);
    const deployDirectory = async (
        site_id: string,
        deploy_id: string,
        remote_file_info: Record<string, string>,
        local_dir: string
    ) => {
        // TODO: This was just copied from the server. Ideally, they could share this code somehow.
        const paths = glob('**/*', { cwd: local_dir, dot: true, nodir: true });
        const files: Record<string, string> = {};
        await Promise.all(
            paths.map((p) => {
                files[p] = fromFileSync(join(local_dir, p), { algorithm: 'md5' });
            })
        );

        const delete_files = Object.keys(deletedDiff(remote_file_info, files)).map(
            (f) => () => deleteDeployFile(site_id, deploy_id, f)
        );
        const upload_files = [
            ...Object.keys(addedDiff(remote_file_info, files)),
            ...Object.keys(updatedDiff(remote_file_info, files)),
        ].map((f) => () => uploadDeployFile(site_id, deploy_id, f, join(local_dir, f)));

        return chunkPromise([...delete_files, ...upload_files], { concurrent: 5 });
    };
    const publishDeploy = (site_id: string, deploy_id: string): EmptyResponse =>
        POST(`/site/${site_id}/deploy/${deploy_id}/publish`);

    return {
        raw: ax,

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
