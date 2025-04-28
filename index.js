#!/usr/bin/env node

import { program } from "commander";
import { createGitContextSwitcher } from "./lib/gitContextSwitcher.js";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "package.json"), "utf8")
);
const switcher = createGitContextSwitcher();

program
  .name("git-context-switcher")
  .description("A tool to manage multiple git context configurations")
  .version(packageJson.version);

program
  .command("setup")
  .description("Run the interactive setup wizard")
  .action(() => switcher.runSetupWizard());

program
  .command("list")
  .description("List all configured contexts")
  .action(() => switcher.listContexts());

program
  .command("add")
  .description("Add a new context")
  .action(() => switcher.addContext());

program
  .command("remove")
  .description("Remove an existing context")
  .action(() => switcher.removeContext());

program
  .command("apply")
  .description("Apply configuration based on current directory")
  .action(() => switcher.applyContext());

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
