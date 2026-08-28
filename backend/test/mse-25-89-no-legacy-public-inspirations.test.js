const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "../../frontend");

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

test("MSE-25.89 FeaturesV2 uses canonical inspiration route", () => {
  const source = read(
    "components/public-site/renderers/FeaturesV2Renderer.js"
  );

  assert.doesNotMatch(
    source,
    /\$\{root\}\/inspirations/
  );

  assert.match(
    source,
    /\$\{root\}\/inspiration/
  );
});
