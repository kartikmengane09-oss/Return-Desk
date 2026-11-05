// The application package is CommonJS, so the Prisma seed command uses require.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const customers = [
  ["Aarav Mehta", "aarav.mehta@example.com"],
  ["Meera Iyer", "meera.iyer@example.com"],
  ["Rohan Kapoor", "rohan.kapoor@example.com"],
  ["Ananya Rao", "ananya.rao@example.com"],
  ["Vikram Shah", "vikram.shah@example.com"],
  ["Kavya Nair", "kavya.nair@example.com"],
  ["Arjun Malhotra", "arjun.malhotra@example.com"],
  ["Ishita Sen", "ishita.sen@example.com"],
  ["Nikhil Bansal", "nikhil.bansal@example.com"],
  ["Priya Desai", "priya.desai@example.com"],
  ["Dev Patel", "dev.patel@example.com"],
  ["Sana Khan", "sana.khan@example.com"],
  ["Aditya Verma", "aditya.verma@example.com"],
  ["Neha Gupta", "neha.gupta@example.com"],
  ["Kabir Joshi", "kabir.joshi@example.com"],
  ["Riya Bose", "riya.bose@example.com"],
  ["Manav Singh", "manav.singh@example.com"],
  ["Tara Menon", "tara.menon@example.com"],
  ["Yash Arora", "yash.arora@example.com"],
  ["Diya Kulkarni", "diya.kulkarni@example.com"],
  ["Rahul Sethi", "rahul.sethi@example.com"],
  ["Aisha Thomas", "aisha.thomas@example.com"],
  ["Karan Khanna", "karan.khanna@example.com"],
  ["Simran Gill", "simran.gill@example.com"],
  ["Varun Chawla", "varun.chawla@example.com"],
  ["Pooja Sinha", "pooja.sinha@example.com"],
  ["Aman Jain", "aman.jain@example.com"],
  ["Naina Roy", "naina.roy@example.com"],
  ["Siddharth Das", "siddharth.das@example.com"],
  ["Leela Krishnan", "leela.krishnan@example.com"],
];

const items = [
  "Noise-Cancelling Headphones",
  "Stainless Steel Water Bottle",
  "Ergonomic Wireless Mouse",
  "Cotton Travel Backpack",
  "Smart LED Desk Lamp",
  "Portable Bluetooth Speaker",
];

const statuses = ["OPEN", "IN_REVIEW", "APPROVED", "REJECTED", "COMPLETED"];
const reasons = [
  "DAMAGED",
  "WRONG_ITEM",
  "NOT_AS_DESCRIBED",
  "NO_LONGER_NEEDED",
  "OTHER",
];
const resolutions = ["REFUND", "REPLACEMENT", "STORE_CREDIT"];

function requestData(index) {
  const status = statuses[index % statuses.length];
  const reason = reasons[index % reasons.length];
  const resolution =
    status === "APPROVED" || status === "COMPLETED"
      ? resolutions[index % resolutions.length]
      : null;
  const createdAt = new Date(Date.UTC(2026, 0, 5 + index, 9, index % 60));
  const [customerName, customerEmail] = customers[index];
  const notes = [];

  if (index % 3 === 0) {
    notes.push({
      content: "Customer contacted support and confirmed the return details.",
      createdAt: new Date(createdAt.getTime() + 60 * 60 * 1000),
    });
  }

  if (index % 5 === 0) {
    notes.push({
      content: "Warehouse inspection has been requested for this return.",
      createdAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000),
    });
  }

  return {
    orderNumber: `ORD-2026-${String(index + 1).padStart(4, "0")}`,
    itemName: items[index % items.length],
    customerName,
    customerEmail,
    reason,
    status,
    resolution,
    refundAmount:
      resolution === "REFUND" ? (49.99 + index * 3).toFixed(2) : null,
    createdAt,
    updatedAt: new Date(createdAt.getTime() + 3 * 60 * 60 * 1000),
    notes: notes.length > 0 ? { create: notes } : undefined,
  };
}

async function main() {
  const existingCount = await prisma.returnRequest.count();

  if (existingCount > 0) {
    throw new Error(
      "Seed aborted: this script only runs against a clean database and will not delete existing data."
    );
  }

  await prisma.$transaction(
    Array.from({ length: 30 }, (_, index) =>
      prisma.returnRequest.create({ data: requestData(index) })
    )
  );

  console.log("Created 30 deterministic return requests and their notes.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
