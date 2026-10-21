import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { DB, type Database } from "../db/db.module.js";
import { AUTH, createAuth } from "./auth.js";
import { AuthGuard } from "./auth.guard.js";

@Global()
@Module({
  providers: [
    { provide: AUTH, inject: [DB], useFactory: (db: Database) => createAuth(db) },
    // Deny by default: every route needs a signed-in user unless it is marked @Public().
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AUTH],
})
export class AuthModule {}
