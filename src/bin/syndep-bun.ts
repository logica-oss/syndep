#!/usr/bin/env bun
import { syncDeps } from "../index.ts";

try {
  syncDeps();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[syndep] sync skipped: ${message}`);
}
