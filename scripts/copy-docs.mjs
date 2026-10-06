import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const source = resolve("src/doc");
const destination = resolve("dist/doc");

if (existsSync(source)) {
  mkdirSync(destination, { recursive: true });
  cpSync(source, destination, {
    recursive: true,
    filter: (entry) =>
      entry === source ||
      entry.endsWith(".md"),
  });
}
