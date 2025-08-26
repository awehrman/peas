"use server";

export async function testServerAction() {
  return {
    message: "Server action is working!",
    timestamp: new Date().toISOString(),
  };
}
