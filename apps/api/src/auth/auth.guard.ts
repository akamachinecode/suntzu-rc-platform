import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";
import { env } from "../env.js";
import { type Auth, InjectAuth, type Session } from "./auth.js";

const IS_PUBLIC = "isPublic";
const CREW_ONLY = "crewOnly";
/** Allows calls without a session (health checks, public data). Use sparingly. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
/** Only the crew (users with the `crew` role, see CREW_EMAILS) may call it. */
export const CrewOnly = () => SetMetadata(CREW_ONLY, true);

type AuthedRequest = Request & { session?: Session };

/** The signed-in user of the current request: `@CurrentUser() user: Session["user"]`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthedRequest>().session!.user,
);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectAuth() private readonly auth: Auth,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const session = await this.auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) throw new UnauthorizedException();
    request.session = session;
    const crewOnly = this.reflector.getAllAndOverride<boolean>(CREW_ONLY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (crewOnly && !isCrew(session.user.email)) throw new ForbiddenException();
    return true;
  }
}

/**
 * The crew is whoever CREW_EMAILS lists right now: checked on every request, so removing someone
 * from the list takes effect at once, even on a session they already have.
 */
export function isCrew(email: string): boolean {
  return env.CREW_EMAILS.includes(email.toLowerCase());
}

export type { Session };
