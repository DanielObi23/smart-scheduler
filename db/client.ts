import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Constructed lazily (on first real query) rather than at module load, so
// `next build`'s static page-data collection doesn't fail before a real
// DATABASE_URL exists in .env.local.
let cached: NeonHttpDatabase<typeof schema> | undefined;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (!cached) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is not set. Add your Neon connection string to .env.local.",
      );
    }
    const sql = neon(process.env.DATABASE_URL);
    cached = drizzle(sql, { schema });
  }
  return cached;
}

export const db: NeonHttpDatabase<typeof schema> = new Proxy(
  {} as NeonHttpDatabase<typeof schema>,
  {
    get(_target, prop, receiver) {
      return Reflect.get(getDb(), prop, receiver);
    },
  },
);
