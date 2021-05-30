import { existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import { flags } from '@oclif/command';
import listr from 'listr';
import Command from '../../base';

export default class CreateSite extends Command {
    static description = 'create a new dattel-powered site';
    static examples = [
        '$ dattel site:create my-new-site -d site.mydomain.tld',
        '$ dattel site:create my-new-site -d site.mydomain.tld -d site.myotherdomain.tld',
        '$ dattel site:create my-new-site -d site.mydomain.tld --disable-cdn',
        '$ dattel site:create my-new-site -d site.mydomain.tld --bunny-pricing-type 1',
    ];

    static args = [{ name: 'site_id', reqired: true, description: 'ID the new site should have' }];
    static flags = {
        domain: flags.string({
            char: 'd',
            description:
                'domain(s) the new site should be reachable under (specify multiple times to use multiple domains)',
            required: true,
            multiple: true,
        }),
        'disable-cdn': flags.boolean({
            description: "don't put the new site behind a CDN but instead serve directly from dattel",
            default: false,
        }),
        'bunny-pricing-type': flags.integer({
            description:
                'the Bunny pricing type (0 for "standard", 1 for "high volume") to use for the CDN (only applicable when the CDN is enabled, defaults to 0)',
            options: ['0', '1'],
            default: 0,
            exclusive: ['disable-cdn'],
        }),
    };

    async run(): Promise<void> {
        const { args, flags } = this.parse(CreateSite);
        const client = await this.getClient();

        if (existsSync('dattel.json'))
            this.error('There already exists a dattel-managed site in this folder.', {
                suggestions: [
                    'Running `dattel site:create` will create a dattel config file `dattel.json` but that already exists in this folder.',
                ],
            });

        await new listr([
            {
                title: 'Creating site…',
                task: () =>
                    client
                        .createSite(
                            args.site_id,
                            flags.domain,
                            !flags['disable-cdn'],
                            flags['bunny-pricing-type'] as 0 | 1
                        )
                        .catch(({ response: { data } }) =>
                            this.error('The site could not be created.', {
                                code: data.statusCode,
                                suggestions: [data.message],
                            })
                        ),
            },
            {
                title: 'Creating initial dattel config `dattel.json`…',
                task: () =>
                    writeFile(
                        'dattel.json',
                        JSON.stringify(
                            {
                                $schema: 'https://github.com/binaro-xyz/dattel-server/blob/master/config-schema.json',
                                site_id: args.site_id,
                            },
                            null,
                            4
                        ) + '\n'
                    ),
            },
        ]).run();
    }
}
