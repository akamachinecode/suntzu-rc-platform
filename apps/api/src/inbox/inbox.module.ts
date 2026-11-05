import { Module } from "@nestjs/common";
import { InboxController } from "./inbox.controller.js";
import { InboxService } from "./inbox.service.js";

/** What anyone sends to the crew: messages, feedback, corrections (specs 0001 and 0003). */
@Module({ controllers: [InboxController], providers: [InboxService] })
export class InboxModule {}
