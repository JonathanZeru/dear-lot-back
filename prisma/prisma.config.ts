import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: (() => {
      const dbUrl = "postgresql://dear_lottery_database_user:Q9F1VmlACWUxSIxTC7CJbg15Kq4y8cxH@dpg-d4jjb4mr433s739ek63g-a/dear_lottery_database";
      if (!dbUrl) {
        throw new Error("Missing DATABASE_URL environment variable");
      }
      return dbUrl;
    })(),
  },
});
