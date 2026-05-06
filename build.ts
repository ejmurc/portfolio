import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { minify } from 'html-minifier-terser';

const ARTICLES_DIR = './src/articles';
const MINIFY_OPTIONS = {
    collapseWhitespace: true,
    removeComments: true,
    minifyCSS: true,
    minifyJS: false,
};
const isDev = process.argv.includes('--serve');
const OUTDIR = 'public';
const INDEX_TEMPLATE = './src/index.html';

interface Article {
    slug: string;
    title: string;
    date: string;
    tag: string;
    summary: string;
    content: string;
}

type ParsedArticle = {
    metadata: Record<string, string>;
    content: string;
};

function formatDate(iso: string): string {
    const d = new Date(iso);
    const day = d.toLocaleDateString('en-US', {
        weekday: 'short',
        timeZone: 'UTC',
    });
    const date = d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });
    const time = d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC',
    });
    return `${date} ${time} UTC (${day})`;
}

function parseArticle(html: string): ParsedArticle {
    const match = html.match(/^<!--\n([\s\S]+?)\n-->\n([\s\S]*)$/);
    if (!match) throw new Error('Missing metadata');
    const metadata: Record<string, string> = {};
    for (const line of match[1].trim().split('\n')) {
        const colon = line.indexOf(':');
        if (colon === -1) continue;
        const key = line.slice(0, colon).trim();
        if (key.length === 0) continue;
        const value = line.slice(colon + 1).trim();
        if (value.length === 0) continue;
        metadata[key] = value;
    }
    return {
        metadata,
        content: match[2].trim(),
    };
}

async function readArticles(): Promise<Article[]> {
    const files = (await fs.promises.readdir(ARTICLES_DIR)).filter((f) =>
        f.endsWith('.html')
    );
    const articles = await Promise.all(
        files.map(async (file) => {
            const slug = path.basename(file, '.html');
            const raw = await fs.promises.readFile(
                path.join(ARTICLES_DIR, file),
                'utf-8'
            );
            const { metadata, content } = parseArticle(raw);
            if (
                !metadata.title ||
                !metadata.date ||
                !metadata.tag ||
                !metadata.summary
            ) {
                throw new Error(`Missing metadata fields in ${file}`);
            }
            const dom = new JSDOM(content);
            const body = dom.window.document.body.innerHTML.trim();
            return {
                slug,
                title: metadata.title,
                date: metadata.date,
                tag: metadata.tag,
                summary: metadata.summary,
                content: body,
            };
        })
    );
    return articles.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
}

function findCssPath(outputs: esbuild.Metafile['outputs']): string {
    for (const [file] of Object.entries(outputs)) {
        if (file.endsWith('.css')) {
            return '/' + path.relative(OUTDIR, file).replace(/\\/g, '/');
        }
    }
    throw new Error('No CSS output found in metafile');
}

const NAV = `[ <a href="/">home</a> ] [ <a href="/writings">writings</a> ]`;

function renderIndex(template: string, articles: Article[]): string {
    const items = articles
        .slice(0, 4)
        .map(
            (article) => `<li>
                       <h3>${article.title}</h3>
                       <p class="metadata">[${article.tag}] ${formatDate(article.date)}</p>
                       <p>${article.summary}</p>
                       <a href="/writings/${article.slug}">Read More</a>
                       </li>`
        )
        .join('\n');
    const css = fs.readFileSync('./src/styles.css', 'utf-8');
    return template
        .replace('{{ styles }}', css)
        .replace('{{ writings }}', items);
}

function renderWritings(articles: Article[], cssPath: string): string {
    const items = articles
        .map(
            (article) => `<article>
            <h2>${article.title}</h2>
       <p class="metadata">[${article.tag}] ${formatDate(article.date)}</p>
       <p>${article.summary}</p>
       <a href="/writings/${article.slug}">Read More</a>
       </article>`
        )
        .join('\n');
    return `<!doctype html>
    <html lang="en">
        <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Writings - Elias Murcray</title>
        <link rel="stylesheet" href="${cssPath}">
        </head>
        <body>
            <header>${NAV}</header>
            <main>
                <h1>Writings</h1>
                ${items}
            </main>
        </body>
    </html>`;
}

function renderArticle(article: Article, cssPath: string): string {
    return `<!doctype html>
    <html lang="en">
    <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${article.title} - Elias Murcray</title>
    <link rel="stylesheet" href="${cssPath}">
    </head>
    <body>
    <header>${NAV}</header>
    <main>
        <h1>${article.title}</h1>
        <p>[${article.tag}] Posted ${formatDate(article.date)}</p>
        <p>${article.summary}</p>
        ${article.content}
    </main>
    </body>
    </html>`;
}

function renderRedirects(articles: Article[]): string {
    return (
        articles
            .map((a) => `/writings/${a.slug}.html /writings/${a.slug} 301`)
            .join('\n') + '\n'
    );
}

const sitePlugin: esbuild.Plugin = {
    name: 'site',
    setup(build) {
        build.onLoad({ filter: /styles\.css$/ }, async (args) => {
            const articleFiles = (await fs.promises.readdir(ARTICLES_DIR))
                .filter((f) => f.endsWith('.html'))
                .map((f) => path.resolve(ARTICLES_DIR, f));

            return {
                contents: await fs.promises.readFile(args.path, 'utf-8'),
                loader: 'css',
                watchFiles: [path.resolve(INDEX_TEMPLATE), ...articleFiles],
                watchDirs: [path.resolve(ARTICLES_DIR)],
            };
        });

        build.onEnd(async (result) => {
            if (!result.metafile) throw new Error('metafile must be enabled');
            const cssPath = findCssPath(result.metafile.outputs);
            const [articles, indexTemplate] = await Promise.all([
                readArticles(),
                fs.promises.readFile(INDEX_TEMPLATE, 'utf-8'),
            ]);
            const process = async (html: string) =>
                isDev ? html : minify(html, MINIFY_OPTIONS);

            await Promise.all([
                (async () => {
                    await fs.promises.writeFile(
                        path.join(OUTDIR, 'index.html'),
                        await process(renderIndex(indexTemplate, articles))
                    );
                })(),
                (async () => {
                    const out = path.join(OUTDIR, 'writings', 'index.html');
                    await fs.promises.mkdir(path.dirname(out), {
                        recursive: true,
                    });
                    await fs.promises.writeFile(
                        out,
                        await process(renderWritings(articles, cssPath))
                    );
                })(),
                ...articles.map(async (article) => {
                    const out = path.join(
                        OUTDIR,
                        'writings',
                        article.slug,
                        'index.html'
                    );
                    await fs.promises.mkdir(path.dirname(out), {
                        recursive: true,
                    });
                    await fs.promises.writeFile(
                        out,
                        await process(renderArticle(article, cssPath))
                    );
                }),
                fs.promises.writeFile(
                    path.join(OUTDIR, '_redirects'),
                    renderRedirects(articles)
                ),
            ]);
        });
    },
};

const config: esbuild.BuildOptions = {
    entryPoints: ['./src/styles.css'],
    bundle: true,
    outdir: OUTDIR,
    metafile: true,
    entryNames: '[name]-[hash]',
    assetNames: '[name]-[hash]',
    loader: { '.webp': 'copy', '.woff2': 'file', '.woff': 'file' },
    plugins: [sitePlugin],
};

if (isDev) {
    const ctx = await esbuild.context({ ...config, sourcemap: true });
    await ctx.watch();
    await ctx.serve({ servedir: OUTDIR, port: 3000 });
    console.log('Server running at http://localhost:3000');
} else {
    await fs.promises.rm(OUTDIR, { recursive: true, force: true });
    await fs.promises.cp('./src/assets', path.join(OUTDIR, './'), {
        recursive: true,
    });
    await esbuild.build({ ...config, minify: true });
}
