const bent = require('bent');

let config;
try {
    config = require('../config.json');
} catch (_) {
    console.error(
        'Invalid or missing configuration. Please copy `config-sample.json` to `config.json` and change the values as needed.'
    );
    process.exit(1);
}

const request = (method) =>
    bent(method, 'json', [200, 201], config.server_url, {
        Authorization: `Bearer ${config.auth_token}`,
    });
const GET = request('GET');
const POST = request('POST');
const PUT = request('PUT');
const DELETE = request('DELETE');

const catcher = async (e) => console.error(await ((e.json && e.json()) || (e.text && e.text())));
module.exports = {
    raw: request,
    createSite: async (site_id, domain) => PUT('/site', { site_id, domain }).catch(catcher),
    deleteSite: async (site_id, delete_token = undefined) =>
        DELETE(`/site/${site_id}`, { delete_token }).catch(catcher),
};
