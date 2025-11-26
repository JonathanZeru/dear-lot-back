import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: (() => {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error("Missing DATABASE_URL environment variable");
      }
      return dbUrl;
    })(),
  },
});
