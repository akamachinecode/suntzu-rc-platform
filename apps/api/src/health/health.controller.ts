import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { sql } from "@workspace/db";
import { Public } from "../auth/auth.guard.js";
import { type Database, InjectDb } from "../db/db.module.js";

// GET /health — used by the load balancer, Docker and uptime monitors.
// Answers 200 only when the database is reachable.
@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(@InjectDb() private readonly db: Database) {}

  @Public()
  @Get()
  @ApiOkResponse({ schema: { type: "object", properties: { status: { type: "string" } } } })
  async check(): Promise<{ status: "ok" }> {
    try {
      await this.db.execute(sql`select 1`);
    } catch {
      throw new ServiceUnavailableException({ status: "unavailable" });
    }
    return { status: "ok" };
  }
}
