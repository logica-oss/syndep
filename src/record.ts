import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const RECORD_DIR = path.join("node_modules", ".cache", "syndep");
const RECORD_FILE = "hash";

const getRecordPath = (cwd: string): string => path.join(cwd, RECORD_DIR, RECORD_FILE);

const isMissingFile = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === "ENOENT";

export const readRecordedHash = (cwd: string): string => {
  try {
    return readFileSync(getRecordPath(cwd), "utf8").trim();
  } catch (error) {
    if (isMissingFile(error)) {
      return "";
    }
    throw error;
  }
};

export const writeRecordedHash = (cwd: string, hash: string): void => {
  mkdirSync(path.join(cwd, RECORD_DIR), { recursive: true });
  writeFileSync(getRecordPath(cwd), `${hash}\n`);
};

export const clearRecordedHash = (cwd: string): void => {
  try {
    rmSync(getRecordPath(cwd), { force: true });
  } catch (error) {
    if (isMissingFile(error)) {
      return;
    }
    throw error;
  }
};
