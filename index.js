#!/usr/bin/env node

import { program } from "commander";
import { createGitContextSwitcher } from "./lib/gitContextSwitcher.js";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
let packageJson;
try {
  const packageContent = readFileSync(join(__dirname, "package.json"), "utf8");
  packageJson = JSON.parse(packageContent);
} catch (error) {
  console.error("Error reading or parsing package.json:", error.message);
  process.exit(1);
}
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

// New commands for 1.1.0 features
program
  .command("detect-url")
  .description("Detect context based on repository URL")
  .action(() => switcher.detectContextFromUrl());

program
  .command("templates")
  .description("List available context templates")
  .action(() => switcher.listTemplates());

program
  .command("export")
  .description("Export contexts to a file")
  .action(() => switcher.exportContexts());

program
  .command("import")
  .description("Import contexts from a file")
  .action(() => switcher.importContexts());

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
