import { Module } from "@nestjs/common";
import { NotesController } from "./notes.controller.js";
import { NotesService } from "./notes.service.js";

/** Example business module. Copy this folder for each domain (properties, payments…). */
@Module({
  controllers: [NotesController],
  providers: [NotesService],
})
export class NotesModule {}
