import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import findUp from 'find-up';

export type DattelConfig = {
    site_id: string;
    publish_dir: string;
    headers_file: string | false;
    redirects_file: string | false;
};
export const default_config = {
    publish_dir: 'public',
    headers_file: '_headers',
    redirects_file: '_redirects',
};

export const readConfig = async (file_name = 'dattel.json'): Promise<DattelConfig> => {
    const config_path = await findUp(file_name);
    if (!config_path) throw new Error('Config not found.');
    const base_dir = dirname(config_path);

    const json = (await readFile(config_path)).toString();
    const user_config = JSON.parse(json);
    if (!user_config.site_id) throw new Error('Specifying `site_id` is required.');

    const config = { ...default_config, ...user_config };
    delete config['$schema'];

    for (const property of ['publish_dir', 'headers_file', 'redirects_file']) {
        config[property] = join(base_dir, config[property]);
    }

    return config;
};
