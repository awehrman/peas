#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Core schema content (generator and datasource)
const coreSchema = `// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

// Looking for ways to speed up your queries, or scale easily with your serverless or edge functions?
// Try Prisma Accelerate: https://pris.ly/cli/accelerate-init

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearchPostgres"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

`;

// Schema files to combine (in order)
const schemaFiles = [
  'prisma/schemas/auth.prisma',
  'prisma/schemas/notes.prisma',
  'prisma/schemas/queue.prisma',
  'prisma/schemas/parsing.prisma',
  'prisma/schemas/meta.prisma',
  'prisma/schemas/source.prisma'
];

// Combine all schema files
let combinedSchema = coreSchema;

schemaFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    combinedSchema += `\n// ${file}\n`;
    combinedSchema += content;
    combinedSchema += '\n';
  } else {
    console.warn(`Warning: Schema file ${file} not found`);
  }
});

// Write the combined schema
const outputPath = path.join(__dirname, '..', 'schema.prisma');
fs.writeFileSync(outputPath, combinedSchema);

console.log('✅ Schema files combined successfully!');
console.log(`📁 Output: ${outputPath}`); 