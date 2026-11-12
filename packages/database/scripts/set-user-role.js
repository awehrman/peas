#!/usr/bin/env node
/* eslint-env node */
/* global console, process */
// Promote or demote an account:
//   yarn workspace @peas/database user:role you@example.com          # ADMIN
//   yarn workspace @peas/database user:role you@example.com USER
//   yarn workspace @peas/database user:role --list
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ROLES = ["ADMIN", "USER"];

async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { email: true, username: true, userType: true },
  });

  if (users.length === 0) {
    console.log("No users yet. Sign up at /invite/<one of your SIGN_UP_CODES> first.");
    return;
  }

  for (const user of users) {
    console.log(`${user.userType.padEnd(5)}  ${user.email}  (${user.username})`);
  }
}

async function main() {
  const [emailOrFlag, roleArg = "ADMIN"] = process.argv.slice(2);

  if (!emailOrFlag || emailOrFlag === "--list") {
    await listUsers();
    return;
  }

  const role = roleArg.toUpperCase();
  if (!ROLES.includes(role)) {
    throw new Error(`Role must be one of ${ROLES.join(", ")}`);
  }

  const user = await prisma.user.findUnique({ where: { email: emailOrFlag } });
  if (!user) {
    throw new Error(`No user with email ${emailOrFlag}. Run with --list to see accounts.`);
  }

  await prisma.user.update({ where: { id: user.id }, data: { userType: role } });
  console.log(`✅ ${emailOrFlag} is now ${role}. Reload the app to see the change.`);
}

main()
  .catch((error) => {
    console.error(`❌ ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
