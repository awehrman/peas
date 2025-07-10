// Test script to verify environment variable loading
console.log("Testing environment variable loading...");

// Try to load dotenv
try {
  require("dotenv").config();
  console.log("✅ dotenv loaded successfully");
} catch (e) {
  console.log("❌ dotenv not available:", e.message);
}

// Check the environment variable
const codesString = process.env.SIGN_UP_CODES;
console.log("🌍 SIGN_UP_CODES:", codesString);

if (codesString) {
  try {
    const codes = JSON.parse(codesString);
    console.log("📋 Parsed as JSON:", codes);
  } catch {
    const codes = codesString.split(",").map((code) => ({ code: code.trim() }));
    console.log("📋 Parsed as comma-separated:", codes);
  }
} else {
  console.log("❌ No SIGN_UP_CODES found");
}
