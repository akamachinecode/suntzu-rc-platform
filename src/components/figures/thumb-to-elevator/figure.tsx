import "@/components/iso/iso.css";
import { Plate } from "@/components/iso/react/draw";
import { ThumbToElevatorArt } from "./art";
import {
  ARM_HOLE,
  HORN_HOLE,
  MAX_ELEVATOR,
  PUSHROD,
  REST,
  SERVO_TRAVEL,
  readoutOf,
  throwOf,
} from "./model";

/** One command followed from the transmitter stick to the elevator. */
export function ThumbToElevatorFigure({ fig = "Fig 1" }: { fig?: string }) {
  return (
    <div className="iso servo-figure" data-theme="light">
      <Plate
        fig={fig}
        title="Thumb to elevator"
        hint="Drag across the bench, or use ← →"
        readout={readoutOf(REST)}
        keys={[
          { mark: "lit", label: "Elevator, the part you're steering" },
          { mark: "raised", label: "Bench hardware" },
          { mark: "edge", label: "Servo lead and antennas" },
        ]}
        caption={`Full stick sends a 2000 µs pulse and the servo turns ${SERVO_TRAVEL}°. Its ${ARM_HOLE} mm arm pushes a ${PUSHROD} mm pushrod into a ${HORN_HOLE} mm horn, so the elevator moves only ${MAX_ELEVATOR.toFixed(1)}° and the trailing edge ${throwOf(MAX_ELEVATOR).toFixed(1)} mm. A longer horn or a shorter arm hole gives less throw and more precision.`}
      >
        <ThumbToElevatorArt />
      </Plate>
    </div>
  );
}
