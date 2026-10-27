import { Controller, Get, Header, Param } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  host,
  type Host,
  hostDetail,
  type HostDetail,
  placeDetail,
  type PlaceDetail,
} from "@workspace/shared";
import { Public } from "../auth/auth.guard.js";
import { Bit } from "../common/trace.js";
import { openApi } from "../common/zod.js";
import { PlacesService } from "./places.service.js";

const PUBLIC_CACHE = "public, max-age=300";

@ApiTags("places")
@Controller()
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

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
