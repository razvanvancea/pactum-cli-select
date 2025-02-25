#!/usr/bin/env node
const { execSync } = require("child_process");
const inquirer = require("inquirer").default || require("inquirer");
const fs = require("fs");
const path = require("path");

async function main() {
  const testDir = "./tests";
  const testFiles = getTestFiles(testDir);

  if (!testFiles.some((choice) => !choice.disabled)) {
    console.error("'No valid test files found. Make sure the test files are located under `tests` folder and contain .spec.js or .test.js extension (e.g. tests/login.spec.js or tests/login.test.js)'");
    return;
  }

  // Step 1: Ask user whether to run entire spec files or select specific tests
  const { runMode } = await inquirer.prompt([
    {
      type: "list",
      name: "runMode",
      message: "Do you want to run entire spec files or select specific tests?",
      choices: [
        { name: "Run entire spec files", value: "spec" },
        { name: "Select specific tests", value: "tests" },
      ],
    },
  ]);

  // Step 2: Allow multiple spec file selection
  const { selectedFiles } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selectedFiles",
      message: "Select one or more test spec files:",
      choices: testFiles,
    },
  ]);

  if (selectedFiles.length === 0) {
    console.error("No spec files selected.");
    return;
  }

  // Step 3: If running the entire selected spec files
  if (runMode === "spec") {
    const command = `npx mocha ${selectedFiles.map((file) => path.join(testDir, file)).join(" ")} --timeout=10000`;
    console.log(`Running: ${command}`);
    execSync(command, { stdio: "inherit" });
    return;
  }

  // Step 4: If selecting specific tests, iterate over the selected files
  let testCommands = [];

  for (const file of selectedFiles) {
    const testFilePath = path.join(testDir, file);
    const testTitles = getTestTitles(testFilePath);

    if (!testTitles.some((choice) => !choice.disabled)) {
      console.error(`No tests found in ${file}. Skipping.`);
      continue;
    }

    const { selectedTitles } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "selectedTitles",
        message: `Select test titles to run in ${file}:`,
        choices: testTitles,
      },
    ]);

    if (selectedTitles.length > 0) {
      const grepPattern = selectedTitles
        .map((title) => `-g "${title}"`)
        .join(" ");
      testCommands.push(
        `npx mocha ${testFilePath} ${grepPattern} --timeout=10000`,
      );
    }
  }

  if (testCommands.length > 0) {
    console.log("Running selected tests...");
    for (const cmd of testCommands) {
      console.log(`Executing: ${cmd}`);
      execSync(cmd, { stdio: "inherit" });
    }
  } else {
    console.error("No tests selected to run.");
  }
}

function getTestFiles(testDir) {
  const files = fs
    .readdirSync(testDir)
    .filter((file) => /\.(spec|test)\.(js|ts)$/.test(file));

  return files.length > 0
    ? files.map((file) => ({ name: file, value: file }))
    : [{ name: "No test files found", value: null, disabled: true }];
}

function getTestTitles(testFile) {
  const content = fs.readFileSync(testFile, "utf-8");
  const matches = content.match(/it\(['"`](.*?)['"`]/g) || [];
  const titles = matches.map((match) => match.match(/it\(['"`](.*?)['"`]/)[1]);
  return titles.length > 0
    ? titles.map((title) => ({ name: title, value: title }))
    : [{ name: "No tests found in file", value: null, disabled: true }];
}

module.exports.main = main;
if (require.main === module) main();
