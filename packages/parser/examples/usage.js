// Example usage of the parser package
// This shows how to import and use different versions

// Default import (uses v2)
import { parse } from "@peas/parser";

// Version-specific imports
import { v1, v2 } from "@peas/parser";

// Minified imports
import v1Minified from "@peas/parser/v1/minified";
import v2Minified from "@peas/parser/v2/minified";

// Example recipe text
const recipeText = `
Title: Chocolate Chip Cookies
Ingredients:
- 2 cups flour
- 1 cup sugar
- 1/2 cup butter
Instructions:
1. Mix ingredients
2. Bake at 350°F for 10 minutes
`;

// Using default parser (v2)
try {
  const result = parse(recipeText);
  console.log("Default parser result:", result);
} catch (error) {
  console.error("Default parser error:", error.message);
}

// Using v1 parser
try {
  const v1Result = v1.parse(recipeText);
  console.log("V1 parser result:", v1Result);
} catch (error) {
  console.error("V1 parser error:", error.message);
}

// Using v2 parser explicitly
try {
  const v2Result = v2.parse(recipeText);
  console.log("V2 parser result:", v2Result);
} catch (error) {
  console.error("V2 parser error:", error.message);
}

// Using minified versions
try {
  const v1MinResult = v1Minified.parse(recipeText);
  console.log("V1 minified result:", v1MinResult);
} catch (error) {
  console.error("V1 minified error:", error.message);
}

try {
  const v2MinResult = v2Minified.parse(recipeText);
  console.log("V2 minified result:", v2MinResult);
} catch (error) {
  console.error("V2 minified error:", error.message);
}
