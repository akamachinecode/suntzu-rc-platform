-- Search across the whole site (docs/specs/0005-search.md), the part Drizzle doesn't model:
-- extensions, the searchable columns, the triggers that keep search_documents in step with
-- events, places and hosts, and every word on the site (to correct misspellings).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;
--> statement-breakpoint
-- Lower case, no accents, "R/C" → "rc", "fly-in" → "flyin", only letters and digits. The API
-- normalises what people type the same way (apps/api/src/search/query.ts).
CREATE FUNCTION search_norm(input text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $$
  SELECT trim(regexp_replace(regexp_replace(regexp_replace(
    lower(public.unaccent('public.unaccent'::regdictionary, input)),
    '\mr\s*[/.]\s*c\M\.?', 'rc', 'g'),
    '\mfly-?ins?\M', 'flyin', 'g'),
    '[^a-z0-9]+', ' ', 'g'))
$$;
--> statement-breakpoint
ALTER TABLE search_documents
  ADD COLUMN tsv tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', search_norm(title)), 'A') ||
    setweight(to_tsvector('english', search_norm(subtitle)), 'B') ||
    setweight(to_tsvector('english', search_norm(body)), 'C')) STORED,
  ADD COLUMN title_norm text GENERATED ALWAYS AS (search_norm(title)) STORED;
--> statement-breakpoint
CREATE INDEX search_documents_tsv_idx ON search_documents USING gin (tsv);
--> statement-breakpoint
CREATE INDEX search_documents_title_trgm_idx ON search_documents USING gin (title_norm gin_trgm_ops);
--> statement-breakpoint
-- Words for the disciplines, so "helicopter" or "cars" find what is tagged with them.
CREATE FUNCTION search_discipline_words(list text[]) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT concat_ws(' ',
    CASE WHEN 'air' = ANY(list) THEN 'planes airplanes jets' END,
    CASE WHEN 'rotor' = ANY(list) THEN 'helicopters' END,
    CASE WHEN 'ground' = ANY(list) THEN 'cars trucks crawlers' END,
    CASE WHEN 'fpv' = ANY(list) THEN 'fpv drones' END)
$$;
--> statement-breakpoint
-- One event, as the public calendar shows it: published and not rejected, or not at all.
CREATE FUNCTION search_refresh_event(target uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO search_documents AS d
    (id, type, title, subtitle, body, url, latitude, longitude, starts_on, ends_on, weight, updated_at)
  SELECT 'event:' || e.id, 'event', e.name,
    concat_ws(' · ',
      CASE WHEN e.status = 'cancelled' THEN 'Cancelled' END,
      CASE e.kind WHEN 'fly-in' THEN 'Fly-in' WHEN 'competition' THEN 'Competition' WHEN 'race' THEN 'Race'
        WHEN 'show' THEN 'Show' WHEN 'swap-meet' THEN 'Swap meet' WHEN 'open-day' THEN 'Open day'
        WHEN 'course' THEN 'Course' ELSE 'Event' END,
      nullif(concat_ws(', ', coalesce(p.name, e.place_text), p.city), '')),
    concat_ws(' ', e.summary, h.name, array_to_string(e.sanctions, ' '), array_to_string(e.classes, ' '),
      search_discipline_words(ARRAY[e.discipline::text]),
      CASE WHEN e.beginner_friendly THEN 'beginners newcomers welcome' END),
    '/events/' || e.slug, p.latitude, p.longitude, e.start_date,
    CASE WHEN e.date_precision = 'month' THEN (e.start_date + interval '1 month' - interval '1 day')::date
      ELSE coalesce(e.end_date, e.start_date) END,
    3, now()
  FROM events e
  LEFT JOIN places p ON p.id = e.place_id
  LEFT JOIN hosts h ON h.id = e.host_id
  WHERE e.id = target AND e.published_at IS NOT NULL AND e.rejected_at IS NULL
  ON CONFLICT (id) DO UPDATE SET title = excluded.title, subtitle = excluded.subtitle, body = excluded.body,
    url = excluded.url, latitude = excluded.latitude, longitude = excluded.longitude,
    starts_on = excluded.starts_on, ends_on = excluded.ends_on, updated_at = now();
  IF NOT FOUND THEN
    DELETE FROM search_documents WHERE id = 'event:' || target;
  END IF;
END $$;
--> statement-breakpoint
CREATE FUNCTION search_refresh_place(target uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO search_documents AS d
    (id, type, title, subtitle, body, url, latitude, longitude, weight, updated_at)
  SELECT 'place:' || p.id, 'place', p.name,
    concat_ws(' · ',
      CASE p.kind WHEN 'flying-field' THEN 'Flying field' WHEN 'car-track' THEN 'Car track'
        WHEN 'indoor' THEN 'Indoor' ELSE 'Venue' END,
      nullif(concat_ws(', ', p.city, p.county || ' County'), '')),
    concat_ws(' ', h.name, array_to_string(p.aliases, ' '), search_discipline_words(p.disciplines::text[]),
      p.address, p.notes, CASE WHEN p.is_fria THEN 'FRIA' END),
    '/places/' || p.slug, p.latitude, p.longitude, 2, now()
  FROM places p
  LEFT JOIN hosts h ON h.id = p.host_id
  WHERE p.id = target
  ON CONFLICT (id) DO UPDATE SET title = excluded.title, subtitle = excluded.subtitle, body = excluded.body,
    url = excluded.url, latitude = excluded.latitude, longitude = excluded.longitude, updated_at = now();
  IF NOT FOUND THEN
    DELETE FROM search_documents WHERE id = 'place:' || target;
  END IF;
END $$;
--> statement-breakpoint
-- A club, track, shop or organiser, placed at the middle of its fields.
CREATE FUNCTION search_refresh_host(target uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO search_documents AS d
    (id, type, title, subtitle, body, url, latitude, longitude, weight, updated_at)
  SELECT 'club:' || h.id, 'club', h.name,
    concat_ws(' · ',
      CASE h.kind WHEN 'club' THEN 'Club' WHEN 'track' THEN 'Track' WHEN 'shop' THEN 'Shop'
        WHEN 'sanctioning-body' THEN 'Sanctioning body' ELSE 'Organiser' END,
      nullif(concat_ws(', ', h.city, h.county || ' County'), '')),
    concat_ws(' ', h.summary, array_to_string(h.aliases, ' '), search_discipline_words(h.disciplines::text[]),
      CASE WHEN h.accepts_newcomers THEN 'beginners newcomers welcome' END),
    '/clubs/' || h.slug,
    (SELECT avg(p.latitude) FROM places p WHERE p.host_id = h.id),
    (SELECT avg(p.longitude) FROM places p WHERE p.host_id = h.id),
    2, now()
  FROM hosts h
  WHERE h.id = target
  ON CONFLICT (id) DO UPDATE SET title = excluded.title, subtitle = excluded.subtitle, body = excluded.body,
    url = excluded.url, latitude = excluded.latitude, longitude = excluded.longitude, updated_at = now();
  IF NOT FOUND THEN
    DELETE FROM search_documents WHERE id = 'club:' || target;
  END IF;
END $$;
--> statement-breakpoint
CREATE FUNCTION search_sync_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM search_refresh_event(CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END);
  RETURN NULL;
END $$;
--> statement-breakpoint
-- A place's name and town appear on its events, and its position places its club.
CREATE FUNCTION search_sync_place() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM search_refresh_place(CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END);
  IF TG_OP = 'UPDATE' THEN
    PERFORM search_refresh_event(e.id) FROM events e WHERE e.place_id = NEW.id;
  END IF;
  IF TG_OP <> 'INSERT' AND OLD.host_id IS NOT NULL THEN
    PERFORM search_refresh_host(OLD.host_id);
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.host_id IS NOT NULL THEN
    PERFORM search_refresh_host(NEW.host_id);
  END IF;
  RETURN NULL;
END $$;
--> statement-breakpoint
-- A club's name is searchable on its fields and events.
CREATE FUNCTION search_sync_host() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM search_refresh_host(CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END);
  IF TG_OP = 'UPDATE' AND NEW.name IS DISTINCT FROM OLD.name THEN
    PERFORM search_refresh_place(p.id) FROM places p WHERE p.host_id = NEW.id;
    PERFORM search_refresh_event(e.id) FROM events e WHERE e.host_id = NEW.id;
  END IF;
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE TRIGGER search_sync AFTER INSERT OR UPDATE OR DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION search_sync_event();
--> statement-breakpoint
CREATE TRIGGER search_sync AFTER INSERT OR UPDATE OR DELETE ON places
  FOR EACH ROW EXECUTE FUNCTION search_sync_place();
--> statement-breakpoint
CREATE TRIGGER search_sync AFTER INSERT OR UPDATE OR DELETE ON hosts
  FOR EACH ROW EXECUTE FUNCTION search_sync_host();
--> statement-breakpoint
SELECT search_refresh_host(id) FROM hosts;
--> statement-breakpoint
SELECT search_refresh_place(id) FROM places;
--> statement-breakpoint
SELECT search_refresh_event(id) FROM events;
--> statement-breakpoint
-- Every word on the site and how many documents use it. The API refreshes it (concurrently, so
-- searches never wait) when it starts and at most every five minutes after a change. Names are
-- schema-qualified: PostgreSQL refreshes materialized views with an empty search path.
CREATE MATERIALIZED VIEW search_words AS
  SELECT word, ndoc FROM ts_stat(
    'SELECT to_tsvector(''simple'', title_norm || '' '' || public.search_norm(subtitle) || '' '' || public.search_norm(body)) FROM public.search_documents');
--> statement-breakpoint
CREATE UNIQUE INDEX search_words_word_idx ON search_words (word);
--> statement-breakpoint
CREATE INDEX search_words_trgm_idx ON search_words USING gin (word gin_trgm_ops);
