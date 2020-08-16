# dattel-client

**TODO: This is still very much a work in progress. Neither the code nor this README is done yet.**

## Example

A small example on how to use the client:

```js
const api = require('dattel-client');

async function main() {
    try {
        const site_id = 'my_site';
        const domain = 'my-site.my-domain.tld';

        console.log('Creating site.');
        await api.createSite(site_id, domain);

        console.log('Starting deploy.');
        const deploy_details = (await api.startDeploy(site_id)).deploy;

        console.log('Deploying directory.');
        await api.deployDirectory(
            site_id,
            deploy_details.id,
            deploy_details.files,
            '/path/to/static/site'
        );

        console.log('Publishing deploy.');
        await api.publishDeploy(site_id, deploy_details.id);
    } catch (err) {
        await fail(err);
    }
}

main();
```
