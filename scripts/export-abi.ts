import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ARTIFACTS: { artifactPath: string; outputPath: string; exportName: string }[] = [
  {
    artifactPath: "artifacts/contracts/HumanPass.sol/HumanPass.json",
    outputPath: "lib/contracts/HumanPass.abi.ts",
    exportName: "humanPassAbi",
  },
  {
    artifactPath: "artifacts/contracts/examples/HumanProtectedAction.sol/HumanProtectedAction.json",
    outputPath: "lib/contracts/HumanProtectedAction.abi.ts",
    exportName: "humanProtectedActionAbi",
  },
];

async function main() {
  for (const { artifactPath, outputPath, exportName } of ARTIFACTS) {
    const fullArtifactPath = path.join(process.cwd(), artifactPath);
    const fullOutputPath = path.join(process.cwd(), outputPath);

    try {
      const artifact = JSON.parse(await readFile(fullArtifactPath, "utf8")) as { abi: unknown };
      await mkdir(path.dirname(fullOutputPath), { recursive: true });
      const file = `export const ${exportName} = ${JSON.stringify(artifact.abi, null, 2)} as const;\n`;
      await writeFile(fullOutputPath, file, "utf8");
      console.log(`Exported ${exportName} to ${fullOutputPath}`);
    } catch {
      console.warn(`Skipping ${exportName} — artifact not found at ${fullArtifactPath} (run compile:contracts first)`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
