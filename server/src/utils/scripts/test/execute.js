const fs = require("fs");
const path = require("path");
const { runCLI } = require("jest");
const { red, green } = require("colorette");

const TEST_DIR = path.resolve(__dirname, "../../../", "tests");
const REPORT_HEADERS = [
  "### Coverage Report ({{job_id}})",
  "| All Files | Lines | Statement | Branches | Functions |",
  "| -------- | -------- | -------- | -------- | -------- |",
];

(function () {
  const testId = process.argv[2];

  if (!testId) {
    throw new Error("A test Id is required");
  }
  const testDir = `${TEST_DIR}/${testId}`;
  const configData = fs.readFileSync(`${testDir}/config.json`, {
    encoding: "utf-8",
  });
  const config = JSON.parse(configData);

  if (!config.files.length) {
    throw new Error(red("config.json files array is empty"));
  }
  config.files.forEach((file) => {
    if (!file.length) {
      throw new Error(red("config.json files array contains an empty string"));
    }
  });

  const testConfigOptions = {
    collectCoverageFrom: config.files,
    config: "jest.config.json",
    roots: [testDir],
    collectCoverage: true,
    watch: true,
    detectOpenHandles: true,
    testPathPattern: [`tests/${testId}.*|(\\.|/)(test|spec)\\.jsx?$`],
  };

  function createReportFile(report) {
    const reportData = report.join("\n").replace("{{job_id}}", testId);

    fs.writeFileSync(`${testDir}/report.md`, reportData);
  }

  runCLI(testConfigOptions, [testDir])
    .then(({ results, globalConfig }) => {
      if (results.numFailedTests > 0) {
        return;
      }
      console.log("Collating coverage report....");

      const coverageReport = results.coverageMap;

      if (coverageReport) {
        const files = coverageReport.files();
        const normalizedReport = [...REPORT_HEADERS];

        for (const file of files) {
          const fileCoverage = coverageReport.fileCoverageFor(file).toSummary();

          if (!fileCoverage.isEmpty()) {
            normalizedReport.push(
              `| ${[
                file.replace(globalConfig.rootDir, ""),
                fileCoverage.lines.pct,
                fileCoverage.statements.pct,
                fileCoverage.branches.pct,
                fileCoverage.functions.pct,
              ].join(" | ")} |`
            );
            // const totals = {
            //   lines: fileCoverage.lines.pct,
            //   statements: fileCoverage.statements.pct,
            //   branches: fileCoverage.branches.pct,
            //   functions: fileCoverage.functions.pct,
            // };

            // normalizedReport[file.replace(globalConfig.rootDir, "")] = totals;
          }
        }

        if (normalizedReport.length > 1) {
          console.log("Creating report....");

          createReportFile(normalizedReport);

          console.log(green("Report created successfully"));

          return;
        }
      }
      createReportFile(REPORT_HEADERS);
      console.log(
        red(
          `No coverage information found. Check file paths in ${testDir}/config.json`
        )
      );
      return;
    })
    .catch(console.log);
})();
