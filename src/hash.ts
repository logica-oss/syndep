import { createHash, Hash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const updateWithFile = (hash: Hash, cwd: string, file: string): void => {
  const content = readFileSync(path.join(cwd, file));
  hash.update(file);
  hash.update("\0");
  hash.update(content);
  hash.update("\0");
};

// Self-computed hash so hooks also work outside git checkouts (tarballs, submodules).
export const hashManifests = (cwd: string, files: string[]): string => {
  const hash = createHash("sha256");

  for (const file of [...files].toSorted()) {
    updateWithFile(hash, cwd, file);
  }

  return hash.digest("hex");
};
