import Command from '@oclif/command';
import cli from 'cli-ux';
import client from '../index';

export default abstract class extends Command {
    async getClient(): Promise<ReturnType<typeof client>> {
        const prompt_text = (desc: string, env_var: string) =>
            `Please enter your dattel server's ${desc} (you can avoid this prompt by setting the environment variable '${env_var}')`;
        const server_url =
            process.env.DATTEL_SERVER ||
            (await cli.prompt(prompt_text('server URL', 'DATTEL_SERVER'), { required: true }));
        const auth_token =
            process.env.DATTEL_TOKEN ||
            (await cli.prompt(prompt_text('auth token', 'DATTEL_TOKEN'), { required: true, type: 'mask' }));
        return client({ server_url: server_url, auth_token: auth_token });
    }
}
