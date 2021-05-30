import { flags } from '@oclif/command';
import cli from 'cli-ux';
import listr from 'listr';
import Command from '../../base';

export default class DeleteSite extends Command {
    static description = 'delete an existing dattel-powered site';
    static examples = [
        '$ dattel site:delete my-site',
        '$ dattel site:delete my-site --delete-token 6jkhRTzqxDLSrmQYPMHY9',
    ];

    static args = [{ name: 'site_id', reqired: true, description: 'ID of the site to delete' }];
    static flags = {
        'delete-token': flags.string({
            description: 'delete token (used to prevent unintentional deletes, will be prompted for otherwise)',
        }),
    };

    async run(): Promise<void> {
        const { args, flags } = this.parse(DeleteSite);
        const client = await this.getClient();

        const delete_site = (token?: string): Promise<void> =>
            new listr([
                {
                    title: 'Deleting site…',
                    task: (_, task) =>
                        client.deleteSite(args.site_id, token).catch(async (e) => {
                            if (e.response.status === 403) {
                                task.skip('');
                                throw new Error(
                                    'To avoid unintentional deletes, a delete token is required. Please retrieve it from /.dattel-delete-token.'
                                );
                            } else throw e;
                        }),
                },
            ])
                .run()
                .catch(async (e) => {
                    if (e.message.startsWith('To avoid')) {
                        const new_token = await cli.prompt('Enter the delete token', { required: true });
                        return delete_site(new_token);
                    } else throw e;
                });

        await delete_site(flags['delete-token']).catch(({ response: { data } }) =>
            this.error('The site could not be deleted.', {
                code: data.statusCode,
                suggestions: [data.message],
            })
        );
    }
}
