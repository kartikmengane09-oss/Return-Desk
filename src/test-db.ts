import prisma from "./lib/db";

async function main() {
  await prisma.$connect();

  console.log("Successfully connected to PostgreSQL!");

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Database connection failed:", error);
  process.exit(1);
});