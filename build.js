const esbuild = require("esbuild");
const fs = require("fs-extra");
const path = require("path");
const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

async function main() {
  // First, clear the dist directory
  await fs.emptyDir("./dist");
  
  // Bundle the main extension
  const ctx = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: "node",
    outfile: "dist/extension.js",
    external: [
      "vscode",
      "mock-aws-s3",
      "aws-sdk",
      "nock",
      "@mapbox/node-pre-gyp",
    ],
    logLevel: "warning",
    plugins: [esbuildProblemMatcherPlugin],
  });

  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }

  // Copy package.json and update it if needed
  await fs.copy("package.json", "dist/package.json");
  
  // Build the overlay app using the separate build script
  console.log("Building overlay app...");
  const { exec } = require("child_process");
  return new Promise((resolve, reject) => {
    exec(`node overlay-build.js${production ? " --production" : ""}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Overlay build error: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`Overlay build stderr: ${stderr}`);
      }
      console.log(stdout);
      resolve();
    });
  }).then(() => {
    console.log("Main extension and overlay build complete!");
  });
}

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: "esbuild-problem-matcher",
  setup(build) {
    build.onStart(() => {
      console.log("[watch] build started");
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        if (location == null) return;
        console.error(
          `    ${location.file}:${location.line}:${location.column}:`
        );
      });
      console.log("[watch] build finished");
    });
  },
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
