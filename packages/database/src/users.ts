import { prisma } from "./client.js";

export async function getUsers() {
  console.log("getUsers");
  try {
    const users = await prisma.user.findMany();
    return { users };
  } catch (error) {
    return { error };
  }
}
