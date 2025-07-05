import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function fixImports() {
  const distDir = join(__dirname, "../dist");

  try {
    const files = await readdir(distDir, { recursive: true });

    for (const file of files) {
      if (file.endsWith(".js") || file.endsWith(".d.ts")) {
        const filePath = join(distDir, file);
        const content = await readFile(filePath, "utf-8");

        // Replace @/lib/utils with relative path
        const fixedContent = content.replace(
          /from ["']@\/lib\/utils["']/g,
          "from '../../lib/utils.js'"
        );

        if (content !== fixedContent) {
          await writeFile(filePath, fixedContent);
          console.log(`Fixed imports in ${file}`);
        }
      }
    }
  } catch (error) {
    console.error("Error fixing imports:", error);
  }
}

fixImports();
