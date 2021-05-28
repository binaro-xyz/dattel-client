declare module 'netlify-redirect-parser' {
    export type Redirect = {
        host?: string;
        scheme?: string;
        path?: string;
        to: string;
        params?: unknown;
        status?: number;
        force?: boolean;
        proxy?: boolean;
        conditions?: unknown;
    };
    export function parseRedirectsFormat(
        file_path: string
    ): Promise<{
        success: Redirect[];
        errors: { lineNum: number; line: unknown; reason: unknown }[];
    }>;
}
