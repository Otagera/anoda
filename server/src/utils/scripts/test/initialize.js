const fs = require("fs");
const path = require("path");
const { DateTime } = require("luxon");
const { randomBytes } = require("crypto");

const TEST_DIR = path.resolve(__dirname, "../../../", "tests");

function getConfigData(id) {
  return JSON.stringify({
    id,
    files: [],
  });
}

(function () {
  const testId = `${DateTime.now().toFormat("yyyyMMdd")}_${randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;

  const configData = getConfigData(testId);
  const testDir = `${TEST_DIR}/${testId}`;

  fs.mkdirSync(`${testDir}/tests`, { recursive: true });

  fs.writeFileSync(`${testDir}/config.json`, configData);
})();
