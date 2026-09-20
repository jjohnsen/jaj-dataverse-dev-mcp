import { realpathSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

export { main, parseArgs, printHelp } from "./cli.js";

function isDirectExecution(): boolean {
  const entry = process.argv[1];

  if (!entry) {
    return false;
  }

  try {
    return realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    return import.meta.url === pathToFileURL(entry).href;
  }
}

if (isDirectExecution()) {
  const { main } = await import("./cli.js");
  process.exitCode = await main();
}
