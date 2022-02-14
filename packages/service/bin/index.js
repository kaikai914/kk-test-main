#!/usr/bin/env node

const verifyCommit = require("../src/verify-commit");
const Release = require("../src/release");
const checkVersion = require("../src/check-version");

// const rawArgv = process.argv.slice(2);
// const command = rawArgv[0];
const command = process.env.npm_lifecycle_event;

switch (command) {
  case "verify":
    verifyCommit();
    break;
  case "release":
    new Release().run();
    break;
  case "check":
    new checkVersion().run();
    break;
  case "version":
    new checkVersion().updated();
    break;
  default:
    process.exit();
}
