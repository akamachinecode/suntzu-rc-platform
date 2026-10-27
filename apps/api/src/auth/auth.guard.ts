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
    if (crewOnly && session.user.role !== "crew") throw new ForbiddenException();
    return true;
  }
}

export type { Session };
