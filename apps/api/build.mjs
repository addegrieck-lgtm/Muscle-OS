// Bundle de l'API : les packages du workspace (@vaeloria/*, TypeScript source) sont inclus,
// les dépendances npm restent externes et sont résolues depuis node_modules au runtime.
import { build } from "esbuild";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const external = Object.keys(pkg.dependencies).filter((d) => !d.startsWith("@vaeloria/"));

await build({
  entryPoints: ["src/index.ts", "src/migrate.ts"],
  outdir: "dist",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  sourcemap: true,
  external: [...external, ...external.map((d) => `${d}/*`)],
});
console.log("API bundlée dans dist/");
