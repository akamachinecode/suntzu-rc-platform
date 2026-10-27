import { Injectable } from "@nestjs/common";
import { and, gte, lte, schema, sql } from "@workspace/db";
import type { AirspaceCheck, AirspaceQuery } from "@workspace/shared";
import { type Database, InjectDb } from "../db/db.module.js";
import { toPlaceSummary } from "../events/events.service.js";
import { distanceMeters, insideRing, type Ring } from "./census/geometry.js";

const { airspace, airports, places } = schema;
const METERS_PER_MILE = 1609.344;
// The 5-mile notice applies to airports; heliports and seaplane bases matter closer in.
const NEAR_MILES = 5;
// A FRIA's centre is stored, not its outline: a point this close is treated as being there.
const FRIA_MILES = 0.25;

// "Can I fly here?": a plain answer for recreational flyers from the FAA's public data. It's
// guidance, not an authorisation, and the point is neither stored nor logged.
@Injectable()
export class AirspaceService {
  constructor(@InjectDb() private readonly db: Database) {}

  async check({ lat, lng }: AirspaceQuery): Promise<AirspaceCheck> {
    const here = { latitude: lat, longitude: lng };
    const miles = (latitude: number, longitude: number) =>
      Math.round((distanceMeters(here, { latitude, longitude }) / METERS_PER_MILE) * 10) / 10;
    // A box of about ±10 miles first, then exact distances.
    const box = 0.15;

    const [shapes, nearbyAirports, nearbyPlaces] = await Promise.all([
      this.db
        .select()
        .from(airspace)
        .where(
          and(
            lte(airspace.minLat, lat),
            gte(airspace.maxLat, lat),
            lte(airspace.minLng, lng),
            gte(airspace.maxLng, lng),
          ),
        ),
      this.db
        .select()
        .from(airports)
        .where(
          and(
            gte(airports.latitude, lat - box),
            lte(airports.latitude, lat + box),
            gte(airports.longitude, lng - box),
            lte(airports.longitude, lng + box),
          ),
        ),
      this.db
        .select()
        .from(places)
        .where(
          and(
            sql`${places.latitude} between ${lat - 1} and ${lat + 1}`,
            sql`${places.longitude} between ${lng - 1} and ${lng + 1}`,
          ),
        ),
    ]);

    const inside = shapes.filter((shape) => {
      const [outer, ...holes] = shape.rings as Ring[];
      return (
        outer &&
        insideRing([lng, lat], outer) &&
        !holes.some((hole) => insideRing([lng, lat], hole))
      );
    });
    const controlled = inside.filter((shape) => shape.lowerFt <= 400);
    const close = nearbyAirports
      .map((airport) => ({ ...airport, miles: miles(airport.latitude, airport.longitude) }))
      .filter((airport) => airport.miles <= (airport.kind === "airport" ? NEAR_MILES : 1))
      .sort((a, b) => a.miles - b.miles)
      .slice(0, 5);
    const located = nearbyPlaces
      .filter((place) => place.latitude != null && place.longitude != null)
      .map((place) => ({
        ...toPlaceSummary(place),
        miles: miles(place.latitude!, place.longitude!),
      }))
      .sort((a, b) => a.miles - b.miles);
    const fria = located.find((place) => place.isFria && place.miles <= FRIA_MILES) ?? null;

    return {
      verdict: controlled.length
        ? "controlled"
        : fria
          ? "fria"
          : close.length
            ? "near-airport"
            : "clear",
      airspace: inside.map((shape) => ({
        name: shape.name,
        class: shape.class,
        lowerFt: shape.lowerFt,
      })),
      airports: close.map(({ ident, name, kind, miles: distance }) => ({
        ident,
        name,
        kind,
        miles: distance,
      })),
      fria,
      fields: located.filter((place) => place.slug !== fria?.slug).slice(0, 3),
    };
  }
}
