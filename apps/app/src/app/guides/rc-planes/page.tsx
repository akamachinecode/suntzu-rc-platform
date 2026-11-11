import type { Metadata } from "next";
import Link from "next/link";
import { BalanceFigure } from "@/components/figures/balance/figure";
import { AIRFRAME, BALANCED_AT, BATTERY } from "@/components/figures/balance/model";
import { PlaneApartFigure } from "@/components/figures/plane-apart/figure";
import { PlaneApartStage } from "@/components/figures/plane-apart/stage";
import { ThrustStandFigure } from "@/components/figures/thrust-stand/figure";
import { FULL, operatingAt } from "@/components/figures/thrust-stand/model";
import { ThumbToElevatorFigure } from "@/components/figures/thumb-to-elevator/figure";
import {
  ARM_HOLE,
  HORN_HOLE,
  MAX_ELEVATOR,
  SERVO_SPEED,
  SERVO_TRAVEL,
  throwOf,
} from "@/components/figures/thumb-to-elevator/model";
import { PlaneExplorer, type PlanePart } from "@/components/guides/plane-explorer";
import { COLUMN, Column, Prose, SectionTitle, Wide } from "@/components/guides/prose";
import { ThenNow } from "@/components/guides/then-now";
import { Timeline } from "@/components/guides/timeline";
import { Button } from "@workspace/ui/components/button";
import { PLANE_HISTORY } from "@/content/history";

export const metadata: Metadata = {
  title: "The RC plane, taken apart",
  description:
    "How radio-control planes came to be, what every part of a modern trainer does, and an interactive bench that follows one command from the transmitter stick to the elevator.",
};

const PARTS: PlanePart[] = [
  {
    id: "wing",
    name: "Wing",
    does: "Makes the lift. On a trainer it sits on top of the fuselage and tips up slightly at each end.",
    figure: "1.2 to 1.5 m span",
    detail:
      "That high wing and upward tilt, called dihedral, make the plane level itself when you let go of the sticks. It's the most forgiving layout there is.",
  },
  {
    id: "ailerons",
    name: "Ailerons",
    does: "Roll the plane. One goes up while the other goes down.",
    figure: "One servo per side",
    detail:
      "Most foam trainers put a small servo in each wing half. Older designs used one servo in the middle and torque rods out to each aileron.",
  },
  {
    id: "tail",
    name: "Stabiliser and fin",
    does: "Keep the plane pointing the way it's going, like the feathers on an arrow.",
    figure: "Fixed surfaces",
    detail:
      "The horizontal stabiliser steadies pitch and the vertical fin steadies yaw. The moving surfaces hinge off their back edges.",
  },
  {
    id: "elevator",
    name: "Elevator",
    does: "Pitches the nose up or down. Pull back, the trailing edge rises, the tail goes down and the nose comes up.",
    figure: `±${MAX_ELEVATOR.toFixed(0)}° in Fig 2`,
    detail:
      "The throw depends on the linkage, not just the servo. Fig 2 works it out from the arm and horn lengths.",
  },
  {
    id: "rudder",
    name: "Rudder",
    does: "Yaws the nose left or right, and usually steers the nosewheel on the ground too.",
    figure: "Coordinated turns",
    detail:
      "A little rudder with your ailerons keeps a turn clean. Some trainers skip ailerons altogether and turn on rudder alone.",
  },
  {
    id: "motor",
    name: "Brushless motor",
    does: "Spins the propeller. On most trainers it's an outrunner: the outside case is what turns.",
    figure: "KV = rpm per volt",
    detail:
      "A 1000 KV motor on an 11.1 V pack spins about 11,100 rpm with nothing attached. Under load it turns slower, and on a full 12.6 V pack it turns faster.",
  },
  {
    id: "prop",
    name: "Propeller",
    does: "Turns that spin into thrust.",
    figure: "10 × 7",
    detail:
      "Ten inches across, and seven inches of pitch: how far one turn would screw it forward if the air were solid. Bigger props pull harder and draw more current.",
  },
  {
    id: "esc",
    name: "Speed controller (ESC)",
    does: "Turns battery power into the three-phase pulses a brushless motor needs, at whatever throttle you ask for.",
    figure: "Rated in amps",
    detail:
      "Choose one rated above the motor's peak draw. Most have a BEC that powers the receiver and servos, and a cutoff that eases off the motor at around 3.2 to 3.4 V per cell.",
  },
  {
    id: "battery",
    name: "LiPo battery",
    does: "Stores the energy. Light and punchy, and unforgiving if you mistreat it.",
    figure: "3S = 11.1 V",
    detail:
      "Each cell is 3.7 V nominal, 4.2 V full, and around 3.8 to 3.9 V for storage. Never run one below 3 V per cell. A 2200 mAh pack rated 30C can deliver 66 A.",
  },
  {
    id: "receiver",
    name: "Receiver",
    does: "Listens to your transmitter on 2.4 GHz and sends each servo its pulse.",
    figure: "One channel per control",
    detail:
      "Throttle, aileron, elevator and rudder make four. Set the failsafe so that if the signal is lost, the throttle cuts instead of carrying on.",
  },
  {
    id: "servos",
    name: "Servos and pushrods",
    does: "Move each control surface to an exact angle and hold it there against the air.",
    figure: "1000 to 2000 µs",
    detail:
      "A servo reads a pulse about 50 times a second and turns to match it. Pushrods carry the motion to horns on the surfaces. Small foam trainers often use 9 g micro servos.",
  },
  {
    id: "cg",
    name: "Balance point",
    does: "The spot where the plane balances on your fingertips. Get it wrong and nothing else matters.",
    figure: "About ¼ to ⅓ of the chord back",
    detail:
      "The manual gives the exact spot; slide the battery to hit it. The old saying holds: a nose-heavy plane flies badly, a tail-heavy plane flies once.",
  },
];

const THEN_NOW = [
  [
    "Airframe",
    "Balsa kit, built over weeks and covered in heat-shrink film",
    "Foam, out of the box in an evening",
  ],
  [
    "Power",
    "Glow engine on methanol fuel, tuned with a needle valve",
    "Brushless motor and a LiPo pack",
  ],
  [
    "Radio",
    "Crystal-controlled channel, checked against the field's frequency board",
    "2.4 GHz that finds clear channels on its own, with telemetry",
  ],
  [
    "Help",
    "An instructor and a buddy cord",
    "An instructor, a buddy box and gyro modes with a panic button",
  ],
  ["Paperwork", "Club membership", "TRUST, FAA registration and Remote ID, or a FRIA"],
] as const;

const HALF = operatingAt(0.5);
// Flight time on a 2200 mAh pack, using 80% of it as most pilots do.
const minutesAt = (amps: number) => Math.round(((2.2 * 0.8) / amps) * 60);

export default function RcPlanesGuide() {
  return (
    <article>
      <header className={`${COLUMN} pt-10 text-center sm:pt-14`}>
        <p className="font-semibold">
          <Link href="/guides" className="tap underline underline-offset-4">
            Guides
          </Link>
        </p>
        <h1 className="mt-4 text-4xl leading-[0.92] font-black tracking-tight text-balance font-wide sm:text-6xl">
          The RC plane, taken apart.
        </h1>
        <p className="mt-5 text-lg text-pretty">
          More than 120 years of radio, balsa and lithium, every part of a modern trainer, and
          benches you can drive yourself. By the SunTzu RC crew, about 15 minutes.
        </p>
      </header>

      <PlaneApartStage figure={<PlaneApartFigure />} />

      <Prose className="pb-20">
        <p>
          Every RC plane, from a foam trainer to a turbine jet, does the same thing: it turns the
          movement of your thumb into the movement of a surface a few metres away, fast enough that
          it feels like you&apos;re holding the plane. Understanding that chain is the difference
          between flying and being flown.
        </p>
        <p>
          We&apos;ll start where it started, follow one command through a real linkage, then go part
          by part through what you&apos;ll actually buy.
        </p>
      </Prose>

      <section aria-labelledby="history" className="bg-background py-20">
        <Column>
          <SectionTitle id="history">Where it started</SectionTitle>
          <p className="mx-auto mt-5 max-w-[60ch] text-center text-lg text-pretty">
            Scroll through the milestones. Each one links to where we checked it.
          </p>
        </Column>
        {/* The scroll-driven pieces get the wide two-column layout on desktop. */}
        <Wide className="mt-14">
          <Timeline items={PLANE_HISTORY} label="Milestones in radio-controlled flight" />
        </Wide>
      </section>

      <section aria-labelledby="chain" className="py-20">
        <Column>
          <SectionTitle id="chain">From thumb to elevator</SectionTitle>
        </Column>
        <Prose className="mt-8">
          <p>
            Move the stick and the transmitter measures where it is. The receiver turns that into a
            pulse between 1000 and 2000 microseconds, sent about fifty times a second. The servo
            compares the pulse with its own position and drives its arm to match, at roughly{" "}
            {Math.round(SERVO_SPEED)}° a second.
          </p>
          <p>
            Then plain mechanics takes over. The servo arm pushes a pushrod, the pushrod pushes a
            horn on the elevator, and the elevator turns on its hinge. The bench below is that chain
            with real dimensions. Move across it, or tab to it and use the arrow keys.
          </p>
        </Prose>
        <Column className="mt-12">
          <ThumbToElevatorFigure fig="Fig 2" />
        </Column>
        <Prose className="mt-12">
          <p>
            Look at the readout on Fig 2 at full stick. The servo turns {SERVO_TRAVEL}°, but the
            elevator moves only {MAX_ELEVATOR.toFixed(1)}°. That&apos;s because the arm hole is{" "}
            {ARM_HOLE} mm from the servo&apos;s centre and the horn hole is {HORN_HOLE} mm from the
            hinge: the horn is twice as long, so it turns about half as far. The trailing edge ends
            up moving {throwOf(MAX_ELEVATOR).toFixed(1)} mm, which is what the ruler on the bench
            reads.
          </p>
          <p>
            <strong>This is how you tune a plane.</strong> Move the pushrod to an arm hole further
            out, or a horn hole closer in, and you get more throw for aerobatics. Do the opposite
            and the plane gets calmer, and the servo has more leverage against the air. Your
            transmitter can trim throws too, but getting the mechanics close first keeps the
            servo&apos;s full resolution.
          </p>
        </Prose>
      </section>

      <section aria-labelledby="parts" className="bg-background py-20">
        <Column>
          <SectionTitle id="parts">Every part, and what it does</SectionTitle>
          <p className="mx-auto mt-5 max-w-[60ch] text-center text-lg text-pretty">
            A typical electric trainer, from the wingtips in. Scroll and watch the part light up on
            the plane.
          </p>
        </Column>
        {/* The scroll-driven pieces get the wide two-column layout on desktop. */}
        <Wide className="mt-14">
          <PlaneExplorer parts={PARTS} />
        </Wide>
      </section>

      <section aria-labelledby="balance" className="py-20">
        <Column>
          <SectionTitle id="balance">Finding the balance point</SectionTitle>
        </Column>
        <Prose className="mt-8">
          <p>
            Every manual marks a spot under the wing where the plane should balance. Rest it there
            on two fingertips: if the nose drops, it&apos;s nose heavy; if the tail drops, it&apos;s
            tail heavy. The battery is the heaviest thing you can move, so it&apos;s how you fix
            either.
          </p>
          <p>
            The bench below is the same sum, on a lab balance. Slide the battery and watch where the
            beam settles.
          </p>
        </Prose>
        <Column className="mt-12">
          <BalanceFigure fig="Fig 3" />
        </Column>
        <Prose className="mt-12">
          <p>
            The {BATTERY.grams} g pack weighs about a sixth of the {AIRFRAME.grams} g airframe, so
            it has to sit roughly {Math.round(BALANCED_AT / Math.abs(AIRFRAME.at))} times further
            from the mark to balance it: {Math.round(BALANCED_AT)} mm ahead against the
            airframe&apos;s {Math.abs(AIRFRAME.at)} mm behind. Slide it a few centimetres and you
            move the whole plane&apos;s balance by several millimetres.
          </p>
          <p>
            <strong>Nose heavy is safe, tail heavy is not.</strong> A nose-heavy plane needs more up
            elevator and lands faster, but it flies. A tail-heavy one pitches up, stalls and can be
            impossible to recover, which is why the old saying ends &quot;flies once&quot;.
          </p>
        </Prose>
      </section>

      <section aria-labelledby="power" className="py-20">
        <Column>
          <SectionTitle id="power">Power, on the bench</SectionTitle>
        </Column>
        <Prose className="mt-8">
          <p>
            Before a new motor and prop go in a plane, they go on a thrust stand. The motor sits on
            a lever that presses a load cell, a wattmeter sits between the battery and the speed
            controller, and a servo tester stands in for your throttle stick. Try it.
          </p>
        </Prose>
        <Column className="mt-12">
          <ThrustStandFigure fig="Fig 4" />
        </Column>
        <Prose className="mt-12">
          <p>
            Half throttle doesn&apos;t mean half the thrust. From half to full, the rpm goes up
            about {(FULL.rpm / HALF.rpm).toFixed(1)} times, the thrust about{" "}
            {(FULL.grams / HALF.grams).toFixed(1)} times and the power about{" "}
            {(FULL.watts / HALF.watts).toFixed(0)} times. Thrust grows with the square of the rpm,
            power with the cube.
          </p>
          <p>
            <strong>That&apos;s why throttle management is flight time.</strong> At{" "}
            {FULL.amps.toFixed(0)} A, a 2200 mAh pack lasts about {minutesAt(FULL.amps)} minutes. At
            the {HALF.amps.toFixed(0)} A of half throttle it lasts closer to {minutesAt(HALF.amps)}.
            Most trainers cruise well below half and save full power for take-off and climbs.
          </p>
        </Prose>
      </section>

      <section aria-labelledby="then-now" className="py-20">
        <Column>
          <SectionTitle id="then-now">Then and now</SectionTitle>
          <p className="mx-auto mt-5 max-w-[60ch] text-center text-lg text-pretty">
            A club trainer from the seventies and one you could buy this weekend do the same job.
            Almost everything else changed.
          </p>
        </Column>
        <Wide className="mt-12">
          <ThenNow
            then="1970s"
            caption="A 1970s trainer compared with a trainer today"
            rows={THEN_NOW}
          />
        </Wide>
      </section>

      <section aria-labelledby="florida" className="pb-24">
        <Prose>
          <h2
            id="florida"
            className="text-center text-3xl font-black text-balance font-wide sm:text-4xl"
          >
            Flying one in South Florida
          </h2>
          <p className="mt-5">
            Before your first flight you&apos;ll pass the FAA&apos;s free TRUST test, register
            anything 250 g or heavier for $5, and either fit Remote ID or fly at a recognised club
            field. Miami and Fort Lauderdale also sit under busy controlled airspace, which is one
            more reason to start at a club.{" "}
            <Link href="/guides/flying-legally">The full rules, with sources</Link>.
          </p>
          <p>
            Or let us walk you through it. We&apos;ll help pick the trainer, set it up on the bench
            exactly like Fig 2, and stand next to you with a buddy box for the first flight.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/contact?topic=lessons">Book a first flight</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/events">See what&apos;s on</Link>
            </Button>
          </div>
        </Prose>
      </section>
    </article>
  );
}
