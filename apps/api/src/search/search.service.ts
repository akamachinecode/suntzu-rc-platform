import { Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common";
import type { SearchMiss, SearchQuery, SearchResponse } from "@workspace/shared";
import { type Database, InjectDb } from "../db/db.module.js";
import { localDate } from "../events/engine/read.js";
import type { Gazetteer } from "./query.js";
import {
  listMisses,
  loadGazetteer,
  recordMiss,
  refreshWords,
  runSearch,
  syncContent,
} from "./search.js";

// Every word on the site is re-read at most this often after the API starts.
const WORDS_EVERY_MS = 5 * 60_000;
const GAZETTEER_EVERY_MS = 6 * 60 * 60_000;

@Injectable()
export class SearchService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SearchService.name);
  private gazetteer: { value: Gazetteer; at: number } | null = null;
  private wordsAt = 0;
  private refreshing = false;

  constructor(@InjectDb() private readonly db: Database) {}

  /** Guides, rules and services change with a deploy, so the API writes them when it starts. */
  async onApplicationBootstrap(): Promise<void> {
    try {
      await syncContent(this.db);
      await refreshWords(this.db);
      this.wordsAt = Date.now();
    } catch (error) {
      this.logger.error(`Search content not synced: ${String(error)}`);
    }
  }

  async search(query: SearchQuery): Promise<SearchResponse> {
    this.refreshWordsLater();
    return runSearch(this.db, await this.towns(), query, today());
  }

  /** A search the browser says found nothing or little: counted if it still does. */
  async recordMiss(q: string): Promise<void> {
    await recordMiss(this.db, await this.towns(), q, today());
  }

  misses(): Promise<SearchMiss[]> {
    return listMisses(this.db, today());
  }

  private async towns(): Promise<Gazetteer> {
    if (!this.gazetteer || Date.now() - this.gazetteer.at > GAZETTEER_EVERY_MS) {
      this.gazetteer = { value: await loadGazetteer(this.db), at: Date.now() };
    }
    return this.gazetteer.value;
  }

  // New events and places are found by their words at once; this only teaches typo correction
  // their spelling, so it can wait a few minutes and never slows a search down.
  private refreshWordsLater(): void {
    if (this.refreshing || Date.now() - this.wordsAt < WORDS_EVERY_MS) return;
    this.refreshing = true;
    refreshWords(this.db)
      .then(() => (this.wordsAt = Date.now()))
      .catch((error: unknown) => this.logger.error(`Search words not refreshed: ${String(error)}`))
      .finally(() => (this.refreshing = false));
  }
}

const today = () => localDate(new Date(), "America/New_York");
