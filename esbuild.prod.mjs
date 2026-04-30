import * as esbuild from 'esbuild';
import { htmlPlugin } from '@craftamap/esbuild-plugin-html';
import copyStaticFiles from 'esbuild-copy-static-files';

await esbuild.build({
    entryPoints: ['./src/app.ts'],
    bundle: true,
    minify: true,
    outdir: 'public',
    metafile: true,
    loader: {
        '.woff2': 'file',
        '.woff': 'file',
    },
    plugins: [
        htmlPlugin({
            files: [
                {
                    entryPoints: ['src/app.ts'],
                    filename: 'index.html',
                    htmlTemplate: './src/index.html',
                },
            ],
        }),
    ],
});
