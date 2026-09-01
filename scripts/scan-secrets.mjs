import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean).filter((file) => !file.endsWith("pnpm-lock.yaml"));
const rules = [
  ["private key assignment", /(?:PRIVATE_KEY|MNEMONIC|SEED_PHRASE)\s*=\s*['\"]?(?!your-|replace-|example|test)/i],
  ["32-byte hex secret", /\b0x[a-fA-F0-9]{64}\b/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/],
  ["generic API key", /(?:API_KEY|API_SECRET)\s*=\s*['\"]?[A-Za-z0-9_\-]{16,}/i]
];
const findings = [];
for (const file of files) {
  let content;
  try { content = readFileSync(file, "utf8"); } catch { continue; }
  for (const [name, pattern] of rules) if (pattern.test(content)) findings.push(`${file}: ${name}`);
}
if (findings.length) {
  console.error(`Potential secrets found:\n${findings.join("\n")}`);
  process.exit(1);
}
console.log(`Secret scan passed (${files.length} tracked files).`);
