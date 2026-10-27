import { Controller, Get, Header, Param, Query } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import {
  airspaceCheck,
  type AirspaceCheck,
  airspaceQuery,
  type AirspaceQuery,
  host,
  type Host,
  hostDetail,
  type HostDetail,
  placeDetail,
  type PlaceDetail,
} from "@workspace/shared";
import { Public } from "../auth/auth.guard.js";
import { Bit } from "../common/trace.js";
import { openApi, ZodPipe } from "../common/zod.js";
import { AirspaceService } from "./airspace.service.js";
import { PlacesService } from "./places.service.js";

const PUBLIC_CACHE = "public, max-age=300";

@ApiTags("places")
@Controller()
export class PlacesController {
  constructor(
    private readonly places: PlacesService,
    private readonly airspace: AirspaceService,
  ) {}

  // Before places/:slug. The query (the point) isn't logged: log lines carry the route only.
  @Public()
  @Get("airspace/check")
  @Bit("airspace.check")
  @Header("Cache-Control", "no-store")
  @ApiQuery({ name: "lat", required: true })
  @ApiQuery({ name: "lng", required: true })
  @ApiOkResponse({ schema: openApi(airspaceCheck) })
  check(@Query(new ZodPipe(airspaceQuery)) query: AirspaceQuery): Promise<AirspaceCheck> {
    return this.airspace.check(query);
  }

  @Public()
  @Get("places/:slug")
  @Bit("places.get")
  @Header("Cache-Control", PUBLIC_CACHE)
  @ApiOkResponse({ schema: openApi(placeDetail) })
  place(@Param("slug") slug: string): Promise<PlaceDetail> {
    return this.places.place(slug);
  }

  @Public()
  @Get("hosts")
  @Bit("hosts.list")
  @Header("Cache-Control", PUBLIC_CACHE)
  @ApiOkResponse({ schema: { type: "array", items: openApi(host) } })
  hosts(): Promise<Host[]> {
    return this.places.hosts();
  }

  @Public()
  @Get("hosts/:slug")
  @Bit("hosts.get")
  @Header("Cache-Control", PUBLIC_CACHE)
  @ApiOkResponse({ schema: openApi(hostDetail) })
  host(@Param("slug") slug: string): Promise<HostDetail> {
    return this.places.host(slug);
  }
}
