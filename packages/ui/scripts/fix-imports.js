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

        // Replace path aliases with relative paths
        let fixedContent = content;

        // Handle @/lib/utils
        fixedContent = fixedContent.replace(
          /from ["']@\/lib\/utils["']/g,
          "from '../../lib/utils.js'"
        );

        // Handle @/lib/* imports
        fixedContent = fixedContent.replace(
          /from ["']@\/lib\/([^"']+)["']/g,
          "from '../../lib/$1.js'"
        );

        // Handle @/config/* imports
        fixedContent = fixedContent.replace(
          /from ["']@\/config\/([^"']+)["']/g,
          "from '../../config/$1.js'"
        );

        // Handle @/components/* imports
        fixedContent = fixedContent.replace(
          /from ["']@\/components\/([^"']+)["']/g,
          "from '../../components/$1.js'"
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
