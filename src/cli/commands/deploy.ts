import { existsSync } from 'fs';
import { flags } from '@oclif/command';
import listr from 'listr';
import { readConfig } from '../../lib/config';
import Command from '../base';

type DeployListrCtx = {
    deploy_info: { id: string; files: Record<string, string> };
};

export default class DeploySite extends Command {
    static description = `perform a new deploy for a dattel-powered site

This works on the properties set in the dattel config file. You can find all properties in the README: https://github.com/binaro-xyz/dattel-client#CLI

Dattel will walk up the directory tree starting from your cwd until it finds the dattel config or error out if it doesn't.`;
    static examples = [
        '$ dattel deploy',
        '$ dattel deploy -c dattel.prod.json',
        '$ dattel deploy --fail-on-existing-deploy',
        '$ dattel deploy --no-update-headers-and-redirects',
    ];

    static flags = {
        'config-file': flags.string({
            char: 'c',
            description: 'path of the site config file',
            default: 'dattel.json',
        }),
        'fail-on-existing-deploy': flags.boolean({
            description: 'fail if there is an existing deploy, otherwise all in-progress or stale deploys are deleted',
            default: false,
        }),
        'no-update-headers-and-redirects': flags.boolean({
            description: "don't update headers and redirects after publishing the deploy",
            default: false,
        }),
    };

    async run(): Promise<void> {
        const { flags } = this.parse(DeploySite);
        const client = await this.getClient();

        const config = await readConfig(flags['config-file']).catch((e) =>
            this.error(e.message, {
                suggestions: [
                    'Is there a `dattel.json` for the site you are trying to deploy? You can also set a different config path using `-c <path>`.',
                    'Your config file at least needs to specify the `site_id` property.',
                ],
            })
        );
        if (!existsSync(config.publish_dir))
            this.error(`The folder (\`${config.publish_dir}\`) you are trying to deploy doesn't exist.`, {
                suggestions: [
                    'You can override the default publish folder using the `publish_dir` property in your dattel config.',
                ],
            });

        await new listr<DeployListrCtx>([
            {
                title: 'Cancelling existing deploys…',
                enabled: () => !flags['fail-on-existing-deploy'],
                task: () =>
                    // This call will fail if there was no stale deploy, so we just ignore the error.
                    // eslint-disable-next-line @typescript-eslint/no-empty-function
                    client.cancelDeploy(config.site_id).catch(() => {}),
            },
            {
                title: 'Starting deploy…',
                task: async (ctx) => {
                    ctx.deploy_info = (await client.startDeploy(config.site_id)).data.deploy;
                },
            },
            {
                title: 'Uploading files…',
                task: (ctx) =>
                    client.deployDirectory(
                        config.site_id,
                        ctx.deploy_info.id,
                        ctx.deploy_info.files,
                        config.publish_dir
                    ),
            },
            {
                title: 'Publishing deploy…',
                task: (ctx) => client.publishDeploy(config.site_id, ctx.deploy_info.id),
            },
            {
                title: 'Updating headers and redirects…',
                enabled: () => !flags['no-update-headers-and-redirects'],
                task: () => client.setSiteHeadersFromFile(config.site_id, config.headers_file, config.redirects_file),
            },
        ])
            .run()
            .catch(({ response: { data } }) =>
                this.error('The deploy could not be performed.', {
                    code: data.statusCode,
                    suggestions: [data.message],
                })
            );
    }
}
