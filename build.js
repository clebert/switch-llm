import * as esbuild from 'esbuild';
import autoprefixer from 'autoprefixer';
import { createRequire } from 'node:module';
import { htmlPlugin } from 'esbuild-html-plugin';
import process from 'node:process';
import { rm } from 'node:fs/promises';
import stylePlugin from 'esbuild-style-plugin';

const require = createRequire(import.meta.url);
const outdir = `dist`;
const nodeEnv = process.env[`NODE_ENV`] ?? `production`;
const dev = nodeEnv !== `production`;

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: [
    { out: `app`, in: `src/app/main.tsx` },
    { out: `editor.worker`, in: require.resolve(`monaco-editor/esm/vs/editor/editor.worker`) },

    ...[`css`, `html`, `json`, `ts`].map((language) => ({
      out: `${language}.worker`,

      in: require.resolve(
        `monaco-editor/esm/vs/language/${
          language === `ts` ? `typescript` : language
        }/${language}.worker`,
      ),
    })),
  ],

  entryNames: `[dir]/[name]`,
  bundle: true,
  minify: !dev,
  sourcemap: dev ? `inline` : false,
  metafile: true,
  target: `es2022`,
  tsconfig: `tsconfig.base.json`,
  outdir,
  publicPath: `/static`,
  loader: { '.ttf': `file` },

  plugins: [
    stylePlugin({ postcss: { plugins: [require(`tailwindcss`), autoprefixer] } }),

    htmlPlugin({
      outfile: `index.html`,
      language: `en`,

      createHeadElements: (outputUrls) => [
        `<meta charset="utf-8" />`,
        `<meta name="viewport" content="width=device-width, initial-scale=1" />`,

        ...outputUrls
          .filter((url) => url.endsWith(`.css`))
          .map((url) => `<link href="${url}" rel="stylesheet">`),
      ],

      createBodyElements: (outputUrls) => [
        `<main id="app"></main>`,

        `<script src="${outputUrls.find(
          (url) => url.includes(`app`) && url.endsWith(`.js`),
        )}" async></script>`,

        `<script>(${[`editor`, `css`, `html`, `json`, `ts`].reduce(
          (template, workerType) =>
            template.replace(
              `<${workerType}>`,
              /** @type {string} */ (
                outputUrls.find(
                  (url) => url.includes(`${workerType}.worker`) && url.endsWith(`.js`),
                )
              ),
            ),

          setupMonacoEnvironment.toString(),
        )})();</script>`,
      ],
    }),
  ],
};

if (process.argv.includes(`--watch`)) {
  const ctx = await esbuild.context(buildOptions);

  await ctx.watch();
} else {
  await rm(outdir, { recursive: true, force: true });

  await esbuild.build(buildOptions);
}

function setupMonacoEnvironment() {
  self.MonacoEnvironment = {
    getWorkerUrl(_moduleId, label) {
      switch (label) {
        case `css`:
          return `<css>`;
        case `html`:
          return `<html>`;
        case `json`:
          return `<json>`;
        case `typescript`:
        case `javascript`:
          return `<ts>`;
      }

      return `<editor>`;
    },

    createTrustedTypesPolicy() {
      return undefined;
    },
  };
}
