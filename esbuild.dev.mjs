import * as esbuild from 'esbuild';
import { htmlPlugin } from '@craftamap/esbuild-plugin-html';
import copyStaticFiles from 'esbuild-copy-static-files';

const ctx = await esbuild.context({
    entryPoints: ['./src/app.ts'],
    bundle: true,
    outdir: 'public',
    sourcemap: true,
    metafile: true,
    loader: {
        '.woff2': 'file',
        '.woff': 'file',
    },
    plugins: [
        copyStaticFiles({
            src: './src/assets',
            dest: './public',
        }),
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
    banner: {
        js: `new EventSource("/esbuild").addEventListener("change", () => location.reload());`,
    },
});

await ctx.watch();
await ctx.serve({ servedir: 'public', port: 3000 });
console.log('Dev server running at http://localhost:3000');
