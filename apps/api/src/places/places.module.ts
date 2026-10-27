import { Module } from "@nestjs/common";
import { AirspaceService } from "./airspace.service.js";
import { PlacesController } from "./places.controller.js";
import { PlacesService } from "./places.service.js";

/** Places, clubs and tracks (docs/specs/0002-places.md). */
@Module({
  controllers: [PlacesController],
  providers: [PlacesService, AirspaceService],
  exports: [PlacesService],
})
export class PlacesModule {}
