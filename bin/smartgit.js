#!/usr/bin/env node

import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { execSync } from "child_process";

// Utility to run shell commands
function runCommand(command) {
  try {
    return execSync(command, { stdio: "pipe" }).toString().trim();
  } catch (error) {
    console.error(chalk.red(`\n❌ Error running command: ${command}`));
    console.error(error.message);
    process.exit(1);
  }
}

// Fake AI commit message generator
function smartCommitSuggestion(files) {
  if (files.length === 0) return "chore: empty commit (no changes?)";
  if (files.some((file) => file.toLowerCase().includes("auth"))) {
    return "feat: implement authentication system";
  }
  if (
    files.some(
      (file) => file.toLowerCase().includes("readme") || file.endsWith(".md"),
    )
  ) {
    return "docs: update documentation";
  }
  if (files.some((file) => /\.(css|scss|sass)$/.test(file))) {
    return "style: update stylesheets";
  }
  if (
    files.some(
      (file) => /\.(test|spec)\.(js|ts)$/.test(file) || file.includes("test/"),
    )
  ) {
    return "test: update/add tests";
  }
  if (files.some((file) => /\.(js|ts|py|java|cpp)$/.test(file))) {
    return "feat: implement new feature";
  }
  if (files.length > 5) {
    return "chore: multiple changes across project";
  }
  return "chore: minor updates";
}

async function main() {
  console.clear();
  const spinner = ora("🔍 Checking for changes...").start();

  await new Promise((resolve) => setTimeout(resolve, 500));
  const status = runCommand("git status --porcelain");
  spinner.stop();

  if (status.trim() === "") {
    console.log(
      chalk.green("\n✅ No changes to commit. Exiting SmartGit Assistant.\n"),
    );
    process.exit(0);
  }

  console.log(chalk.blue("\n📝 Files with changes:\n"));
  const changedFiles = runCommand("git status --porcelain")
    .split("\n")
    .map((line) => line.trim().slice(2))
    .filter((file) => file.length > 0);

  changedFiles.forEach((file) => {
    console.log(chalk.yellow(`• ${file}`));
  });

  const { stage } = await inquirer.prompt({
    type: "confirm",
    name: "stage",
    message: "✨ Stage all changes?",
    default: true,
  });

  if (!stage) {
    console.log(chalk.red("\n❌ Aborted staging. Exiting.\n"));
    process.exit(0);
  }

  console.clear();
  const stageSpinner = ora("📦 Staging changes...").start();
  runCommand("git add .");
  await new Promise((resolve) => setTimeout(resolve, 500));
  stageSpinner.succeed("✅ Changes staged successfully!");

  console.clear();

  const currentBranch = runCommand("git branch --show-current");

  if (currentBranch === "main" || currentBranch === "master") {
    console.log(chalk.red.bold("\n⚠️  WARNING: You are on the 'main' branch!"));

    const { actionOnMain } = await inquirer.prompt({
      type: "list",
      name: "actionOnMain",
      message: "What would you like to do?",
      choices: [
        { name: "Abort commit (recommended)", value: "abort" },
        { name: "Create a new branch and switch", value: "create-branch" },
        { name: "Continue committing to main (dangerous)", value: "continue" },
      ],
    });

    if (actionOnMain === "abort") {
      console.log(chalk.red("\n❌ Commit aborted to protect 'main' branch.\n"));
      return;
    }

    if (actionOnMain === "create-branch") {
      const { newBranchName } = await inquirer.prompt({
        type: "input",
        name: "newBranchName",
        message: "🔖 Enter a name for your new branch:",
        validate: (input) =>
          input.length > 0 ? true : "Branch name cannot be empty.",
      });

      const branchSpinner = ora(
        `🚀 Creating branch '${newBranchName}'...`,
      ).start();
      runCommand(`git checkout -b ${newBranchName}`);
      await new Promise((resolve) => setTimeout(resolve, 500));
      branchSpinner.succeed(`✅ Switched to new branch '${newBranchName}'!`);
    }

    if (actionOnMain === "continue") {
      console.log(chalk.yellow("\n⚡ Continuing on 'main' as requested...\n"));
    }
  }

  console.clear();

  const stagedFiles = runCommand("git diff --cached --name-only").split("\n");
  const suggestedMessage = smartCommitSuggestion(stagedFiles);

  console.log(chalk.green("\n💡 Suggested commit message:"));
  console.log(chalk.yellow(`\n"${suggestedMessage}"\n\n`));

  const { finalMessage } = await inquirer.prompt({
    type: "input",
    name: "finalMessage",
    message: "📝 Edit commit message (or press Enter to accept):",
    default: suggestedMessage,
  });

  console.clear();

  console.log(chalk.green("\n✅ Files staged for commit:\n"));
  console.log(runCommand("git diff --cached --name-only"));

  console.log(chalk.green("\n✅ Final commit message:\n"));
  console.log(chalk.yellow(`"${finalMessage}"`));

  const { confirm } = await inquirer.prompt({
    type: "confirm",
    name: "confirm",
    message: "🚀 Ready to commit and push?",
    default: true,
  });

  if (!confirm) {
    console.log(chalk.red("\n❌ Commit aborted by user.\n"));
    return;
  }

  console.clear();
  const commitSpinner = ora("📤 Committing and pushing...").start();

  try {
    runCommand(`git commit -m "${finalMessage}"`);
    runCommand("git push");
    await new Promise((resolve) => setTimeout(resolve, 500));
    commitSpinner.succeed("✅ Successfully committed and pushed! 🎉");
  } catch (error) {
    commitSpinner.fail("❌ Failed to commit or push.");
    console.error(error.message);
  }
}

main();
