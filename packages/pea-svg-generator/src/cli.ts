import { PeaGenerator } from "./generator.js";
import fs from "fs";
import path from "path";

async function main() {
  const args = process.argv.slice(2);
  const outputPath = args[0] || "generated-peas.svg";
  
  console.log("🌱 Generating peas...");
  
  const generator = new PeaGenerator({
    width: 1200,
    height: 800,
    peasPerRow: 6,
    margin: 100,
    outputPath
  });
  
  const svg = generator.generate();
  
  // Write to file
  fs.writeFileSync(outputPath, svg, "utf8");
  
  console.log(`✅ Generated ${outputPath}`);
  console.log(`📊 SVG dimensions: 1200x800`);
  console.log(`🫛 Total peas generated: ${generator.generatePeaConfigs().length}`);
  
  // Also create a smaller version for testing
  const smallGenerator = new PeaGenerator({
    width: 600,
    height: 400,
    peasPerRow: 4,
    margin: 50,
    outputPath: "small-peas.svg"
  });
  
  const smallSvg = smallGenerator.generate();
  fs.writeFileSync("small-peas.svg", smallSvg, "utf8");
  
  console.log(`✅ Also generated small-peas.svg for testing`);
}

main().catch(console.error); 