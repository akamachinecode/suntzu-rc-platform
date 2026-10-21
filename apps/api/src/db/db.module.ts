import { Global, Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { createDb, type Database } from "@workspace/db";
import { env } from "../env.js";

export const DB = Symbol("DB");
/** Injects the Drizzle client: `constructor(@InjectDb() private readonly db: Database) {}` */
export const InjectDb = () => Inject(DB);

const { db, pool } = createDb(env.DATABASE_URL);

@Global()
@Module({
  providers: [{ provide: DB, useValue: db }],
  exports: [DB],
})
export class DbModule implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await pool.end();
  }
}

export type { Database };
