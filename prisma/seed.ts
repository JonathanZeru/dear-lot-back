import prisma from "../lib/prisma";
import { hashPIN } from "../lib/utils";


async function main() {
  const pinHash = await hashPIN("12345");

  await prisma.user.create({
    data: {
      userId: "ADMIN001",
      pinHash,
      role: "ADMIN",
      balance: 0
    }
  });

  await prisma.session.createMany({
    data: [
      { name: "MOR", drawTime: "13:00" },
      { name: "EVE", drawTime: "18:00" },
      { name: "NGT", drawTime: "20:00" }
    ]
  });
}

main()
  .then(() => console.log("Seeded"))
  .catch(err => console.error(err));
