import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ARTIFACT_PATH = path.join(
  process.cwd(),
  "artifacts/contracts/HumanPass.sol/HumanPass.json"
);
const OUTPUT_PATH = path.join(process.cwd(), "lib/contracts/HumanPass.abi.ts");

async function main() {
  const artifact = JSON.parse(await readFile(ARTIFACT_PATH, "utf8")) as {
    abi: unknown;
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });

  const file = `export const humanPassAbi = ${JSON.stringify(
    artifact.abi,
    null,
    2
  )} as const;\n`;

  await writeFile(OUTPUT_PATH, file, "utf8");
  console.log(`Exported HumanPass ABI to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
