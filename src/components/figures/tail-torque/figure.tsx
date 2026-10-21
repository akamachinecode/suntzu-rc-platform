import { FigureFrame } from "../figure-frame";
import { TailTorqueArt } from "./art";
import { ARM, HOVER_PITCH, MAIN_TORQUE, NEEDED, readoutOf } from "./model";

/** The tail's job, on a turntable: torque one way, tail thrust the other. */
export function TailTorqueFigure({ fig = "Fig 3" }: { fig?: string }) {
  return (
    <FigureFrame
      fig={fig}
      title="Torque, and the tail that cancels it"
      hint="Drag across the bench to set the tail pitch, or use ← →"
      readout={readoutOf(HOVER_PITCH)}
      keys={[
        { mark: "lit", label: "The tail rotor blades" },
        { mark: "raised", label: "The body, free to turn on its turntable" },
      ]}
      caption={`In a hover a 450's main rotor needs about ${MAIN_TORQUE} N·m to keep turning, and the body feels the same torque the other way. With the tail rotor ${Math.round(ARM * 100)} cm back, it has to push about ${NEEDED.toFixed(1)} N (${Math.round((NEEDED / 9.81) * 1000)} g) sideways to cancel it, which this tail does at about ${HOVER_PITCH}° of pitch. Change the collective and the torque changes with it, so the gyro trims the tail pitch for you. Typical figures, not a measurement.`}
    >
      <TailTorqueArt />
    </FigureFrame>
  );
}
