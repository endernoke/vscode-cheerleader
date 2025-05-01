const esbuild = require("esbuild");
const fs = require("fs-extra");
const path = require("path");
const production = process.argv.includes("--production");

async function main() {
  // Ensure output directory exists
  await fs.ensureDir("./dist/live2d-container");
  
  // Bundle the Electron main process
  await esbuild.build({
    entryPoints: ["live2d-container/main.js"],
    bundle: true,
    platform: "node",
    target: ["node16"],
    minify: production,
    sourcemap: !production,
    outfile: "dist/live2d-container/main.js",
    external: ["electron"],
    logLevel: "info"
  });

  // Bundle the Electron preload script
  await esbuild.build({
    entryPoints: ["live2d-container/preload.js"],
    bundle: true,
    platform: "node",
    target: ["node16"],
    minify: production,
    sourcemap: !production,
    outfile: "dist/live2d-container/preload.js",
    external: ["electron"],
    logLevel: "info"
  });

  // Bundle the Electron renderer process (named index.js)
  await esbuild.build({
    entryPoints: ["live2d-container/index.js"],
    bundle: true,
    platform: "browser",
    target: ["chrome90"],
    minify: production,
    sourcemap: !production,
    outfile: "dist/live2d-container/index.js",
    external: ["electron"],
    logLevel: "info"
  });
  
  // Copy any HTML files
  const htmlFiles = await fs.readdir("live2d-container")
    .then(files => files.filter(file => file.endsWith(".html")));
  
  for (const htmlFile of htmlFiles) {
    await fs.copy(
      path.join("live2d-container", htmlFile),
      path.join("dist/live2d-container", htmlFile)
    );
  }
  
  // Copy all the .css files
  const cssFiles = await fs.readdir("live2d-container")
    .then(files => files.filter(file => file.endsWith(".css")));
  for (const cssFile of cssFiles) {
    await fs.copy(
      path.join("live2d-container", cssFile),
      path.join("dist/live2d-container", cssFile)
    );
  }

  await fs.copy("live2d-container/package.json", "dist/live2d-container/package.json");
  
  console.log("Overlay build complete!");
}

main().catch(error => {
  console.error("Build failed:", error);
  process.exit(1);
});
