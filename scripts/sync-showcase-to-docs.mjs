#!/usr/bin/env node

import { cpSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const SRC = resolve(process.cwd(), "showcase/dist");
const DEST = resolve(process.cwd(), "../docs.doublefin.com/public/showcase");

if (!existsSync(SRC)) {
  console.error(`ERROR: ${SRC} not found. Run 'bun run showcase:build' first.`);
  process.exit(1);
}

const docsRepo = resolve(process.cwd(), "../docs.doublefin.com");
if (!existsSync(docsRepo)) {
  console.error(`ERROR: ${docsRepo} not found. Clone docs.doublefin.com next to orca-ui.`);
  process.exit(1);
}

if (existsSync(DEST)) rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });
cpSync(SRC, DEST, { recursive: true });

console.log(`Synced ${SRC} → ${DEST}`);
