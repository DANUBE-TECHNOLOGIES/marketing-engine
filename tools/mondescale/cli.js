#!/usr/bin/env node
"use strict";

const path = require("node:path");
const {
  findProjectRoot,
  ensureDirectories,
} = require("./core/project");
const { createLogger } = require("./core/logger");

const COMMANDS = {
  doctor: require("./commands/doctor"),
  list: require("./commands/list"),
  show: require("./commands/show"),
  patch: require("./commands/patch"),
};

function help() {
  console.log(`
Mondescale Patch Manager v0.1.0

Usage:
  ./mondescale doctor
  ./mondescale list
  ./mondescale show <PATCH_ID>
  ./mondescale help
`);
}

async function main() {
  const [, , rawCommand = "help", ...args] = process.argv;
  const command = rawCommand.toLowerCase();

  if (["help", "--help", "-h"].includes(command)) {
    help();
    return;
  }

  if (["version", "--version", "-v"].includes(command)) {
    console.log("0.1.0");
    return;
  }

  const handler = COMMANDS[command];

  if (!handler) {
    help();
    process.exitCode = 2;
    return;
  }

  const root = findProjectRoot(
    process.env.MONDESCALE_ROOT || process.cwd()
  );

  ensureDirectories(root);

  const logger = createLogger(root, command);

  logger.info("Commande démarrée", {
    root,
    args,
    cli: path.relative(root, __filename),
  });

  try {
    await handler({ root, logger, args });
    logger.success("Commande terminée");
  } catch (error) {
    logger.error(error.message, { stack: error.stack });
    console.error(`✗ ${error.message}`);
    console.error(`Journal : ${logger.file}`);
    process.exitCode = 1;
  }
}

main();
