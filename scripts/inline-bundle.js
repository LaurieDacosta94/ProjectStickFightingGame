const fs = require("fs");
const path = require("path");

const distDir = path.resolve(__dirname, "..", "dist");
const htmlPath = path.join(distDir, "index.html");

if (!fs.existsSync(htmlPath)) {
  console.error("Build output not found. Run `npm run build` first.");
  process.exit(1);
}

let html = fs.readFileSync(htmlPath, "utf8");

const scriptRegex = /<script[^>]*src="([^"]+)"[^>]*><\/script>/gi;
html = html.replace(scriptRegex, (match, src) => {
  const assetPath = path.join(distDir, src);
  if (!fs.existsSync(assetPath)) {
    console.warn(`Skipping missing asset: ${src}`);
    return match;
  }

  const scriptContent = fs.readFileSync(assetPath, "utf8");
  const sanitizedScript = scriptContent.replace(/<\/script>/gi, "<\\/script>");
  return `<script>\n${sanitizedScript}\n<\/script>`;
});

const cssRegex = /<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*\/?>(?:<\/link>)?/gi;
html = html.replace(cssRegex, (match, href) => {
  const assetPath = path.join(distDir, href);
  if (!fs.existsSync(assetPath)) {
    console.warn(`Skipping missing stylesheet: ${href}`);
    return match;
  }

  const cssContent = fs.readFileSync(assetPath, "utf8");
  return `<style>\n${cssContent}\n<\/style>`;
});

const outputPath = path.join(distDir, "stickman-warfare.html");
fs.writeFileSync(outputPath, html, "utf8");
console.log(`Inlined bundle saved to ${outputPath}`);
