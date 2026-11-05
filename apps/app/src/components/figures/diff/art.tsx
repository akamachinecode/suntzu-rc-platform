import * as React from "react";
import { Dots, Line, Solid } from "@/components/iso/react/draw";
import { STATIC } from "./geometry";
import { DiffLive } from "./live";
import { SPEED_KMH, TRACK_MM, TYRE_MM } from "./model";

function Pillow({ pillow }: { pillow: typeof STATIC.farPillow }) {
  return (
    <>
      <Solid paths={pillow.foot} tone="lo" crease="faint" />
      <Dots points={pillow.footScrews} size={0.5} tone="mid" />
      <Solid paths={pillow.post} tone="mid" crease="faint" />
    </>
  );
}

const BACK = (
  <g key="back">
    <path className="iso-halo" d={STATIC.halo} />
    {STATIC.feet.map((paths, index) => (
      <Solid key={index} paths={paths} tone="lo" crease="faint" />
    ))}
    <Solid paths={STATIC.base} tone="mid" crease="faint" />
    <Line d={STATIC.groove} tone="lo" />
    <Line d={STATIC.screwRings} tone="lo" />
    <Dots points={STATIC.screws} size={0.5} tone="mid" />
    <Solid paths={STATIC.label} tone="lo" crease="none" />
    <Line d={STATIC.labelLine} tone="faint" />
    <Line d={STATIC.labelRule} tone="lo" free />
    {/* the drive, coming in from behind */}
    <Solid paths={STATIC.motorPost} tone="mid" crease="faint" />
    <Solid paths={STATIC.motor} tone="hi" crease="none" />
    <g>
      {STATIC.motorVents
        .filter((line) => line.alpha > 0.02)
        .map((line, index) => (
          <g key={index} opacity={Math.round(line.alpha * 20) / 20}>
            <path className="iso-line" data-tone="lo" d={line.d} />
          </g>
        ))}
    </g>
    <Solid paths={STATIC.inputShaft} tone="hi" crease="none" />
    {/* the far wheel shows its inner face */}
    <Solid paths={STATIC.tyreFar} tone="hi" crease="none" />
    <g data-node="tread-far" />
    <Solid
      paths={STATIC.rimFar}
      tone="mid"
      crease="none"
      inner={<Line d={STATIC.wallFar} tone="lo" />}
    />
    <Solid paths={STATIC.farShaft} tone="hi" crease="none" />
    <Pillow pillow={STATIC.farPillow} />
    <Solid
      paths={STATIC.farPillow.housing}
      tone="mid"
      crease="none"
      inner={<Line d={STATIC.farPillow.seam} tone="faint" />}
    />
  </g>
);

const NEAR = (
  <g key="near">
    <Solid paths={STATIC.nearShaft} tone="hi" crease="none" />
    <Pillow pillow={STATIC.nearPillow} />
    <Solid
      paths={STATIC.nearPillow.housing}
      tone="mid"
      crease="none"
      inner={<Line d={STATIC.nearPillow.seam} tone="faint" />}
    />
    <Solid paths={STATIC.tyreNear} tone="hi" crease="none" />
  </g>
);

const LABEL = `A truck's rear axle on a bench, its differential drawn larger than life: the ring gear and cage, two side gears on the axle shafts and two spider gears on a cross pin between them. The truck is rolling at ${SPEED_KMH} km/h on ${TYRE_MM} mm tyres with the wheels ${TRACK_MM} mm apart. Steer and the outside wheel speeds up, the inside one slows down, and the spider gears turn on their pin.`;

export function DiffArt() {
  return (
    <DiffLive
      label={LABEL}
      back={BACK}
      pinion={<Solid key="pinion" paths={STATIC.pinion} tone="hi" crease="none" />}
      ring={<Solid key="ring" paths={STATIC.ring} tone="hi" crease="none" />}
      sideFar={<Solid key="side-far" paths={STATIC.sideFar} tone="hi" crease="none" />}
      sideNear={<Solid key="side-near" paths={STATIC.sideNear} tone="hi" crease="none" />}
      plate={<Solid key="plate" paths={STATIC.plate} tone="mid" crease="none" />}
      near={NEAR}
      rim={
        <Solid
          key="rim"
          paths={STATIC.rimNear}
          tone="mid"
          crease="none"
          inner={<Line d={STATIC.wallNear} tone="lo" />}
        />
      }
      nut={<Solid key="nut" paths={STATIC.nutNear} tone="mid" crease="none" />}
    />
  );
}
