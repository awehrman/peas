// Test environment variable loading
console.log("Testing env vars...");
console.log("SIGN_UP_CODES:", process.env.SIGN_UP_CODES);

const codesString = process.env.SIGN_UP_CODES;
if (codesString) {
  try {
    const codes = JSON.parse(codesString);
    console.log("Parsed as JSON:", codes);
  } catch {
    const codes = codesString.split(",").map((code) => ({ code: code.trim() }));
    console.log("Parsed as comma-separated:", codes);
  }
} else {
  console.log("No SIGN_UP_CODES found");
}
