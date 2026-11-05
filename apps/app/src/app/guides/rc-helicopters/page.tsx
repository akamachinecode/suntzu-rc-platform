import type { Metadata } from "next";
import Link from "next/link";
import { HeliApartFigure } from "@/components/figures/heli-apart/figure";
import { HeliApartStage } from "@/components/figures/heli-apart/stage";
import { HoverBenchFigure } from "@/components/figures/hover-bench/figure";
import { HOVER_PITCH, WEIGHT } from "@/components/figures/hover-bench/model";
import { SwashplateFigure } from "@/components/figures/swashplate/figure";
import { CYCLIC_DEG, sweepOf } from "@/components/figures/swashplate/model";
import { TailTorqueFigure } from "@/components/figures/tail-torque/figure";
import { HOVER_PITCH as TAIL_PITCH, NEEDED } from "@/components/figures/tail-torque/model";
import { HeliExplorer, type HeliPart } from "@/components/guides/heli-explorer";
import { COLUMN, Column, Prose, SectionTitle, Wide } from "@/components/guides/prose";
import { Timeline } from "@/components/guides/timeline";
import { Button } from "@workspace/ui/components/button";
import { HELI_HISTORY } from "@/content/heli-history";

export const metadata: Metadata = {
  title: "The RC helicopter, taken apart",
  description:
    "How radio-control helicopters learned to hover, what every part of a modern 450 does, and benches you can drive yourself: the swashplate, the tail and the hover.",
};

const SOURCES = {
  blade450:
    "https://horizonhobby.com/on/demandware.static/Sites-horizon-us-Site/Sites-horizon-master/default/Manuals/Blade450-Manual_EN.pdf",
  align450l: "https://shop.align.com.tw/product_info.php?products_id=5747",
  microbeast: "https://beastx.com/manuals/MICROBEAST_2.0.0_ENG.pdf",
  trex450se: "https://library.modelaviation.com/article/swash-plate-align-t-rex-450se-cde-200706",
  ccpm: "https://library.modelaviation.com/article/product-review-200408",
  guide: "https://www.modelaviation.com/helicopterguide",
  flybar: "https://library.modelaviation.com/article/rc-helicopters-4",
};

const PARTS: HeliPart[] = [
  {
    id: "blades",
    name: "Main blades",
    does: "Make all of the lift. Two blades of about 325 mm on a 450.",
    figure: "About 720 mm across",
    detail:
      "The Blade 450 3D's rotor is 721 mm across and the Align 450LP's 734 mm. The blades are symmetrical and flat on both faces: their pitch, not their shape, decides how much they lift.",
  },
  {
    id: "head",
    name: "Rotor head",
    does: "Holds the blades in grips that turn on a spindle, so each blade can twist to change its pitch.",
    figure: "2,300 to 2,800 rpm",
    detail:
      "That's the T-Rex 450's range across its flight modes, about 40 to 47 turns a second. Spinning blades carry a lot of energy: stand well back.",
  },
  {
    id: "swash",
    name: "Swashplate",
    does: "Turns your stick movements into blade pitch. Raise it for collective, tilt it for cyclic.",
    figure: "120° CCPM",
    detail:
      "Its bottom ring sits on three servos and doesn't turn; its top ring turns with the head. Fig 2 is this part on a bench.",
  },
  {
    id: "servos",
    name: "Cyclic servos",
    does: "Three servos, 120° apart, that hold the swashplate's bottom ring between them.",
    figure: "Three, plus one for the tail",
    detail:
      "No one servo is elevator or pitch. The radio or the flybarless unit mixes your sticks so all three move together for every command: that's CCPM.",
  },
  {
    id: "fbl",
    name: "Flybarless unit",
    does: "A three-axis gyro that steadies the head and holds the tail.",
    figure: "Swash servos up to 200 Hz",
    detail:
      "Your sticks ask for a rate of rotation and the unit makes the helicopter match it, like fly-by-wire. The Microbeast drives its swashplate servos at up to 200 Hz and its tail servo at up to 560 Hz.",
  },
  {
    id: "motor",
    name: "Motor and main gear",
    does: "A brushless outrunner whose small pinion drives the big main gear on the rotor shaft.",
    figure: "11:1",
    detail:
      "On the Align 450L a 121-tooth main gear meets an 11-tooth pinion, so the motor turns eleven times for each turn of the rotor.",
  },
  {
    id: "esc",
    name: "Speed controller",
    does: "Feeds the motor from the battery and, on a helicopter, holds the headspeed steady.",
    figure: "Rated in amps",
    detail:
      "A helicopter flies at a set headspeed. In governor mode the speed controller adds power as the collective loads the rotor, so the rpm doesn't sag in a climb.",
  },
  {
    id: "battery",
    name: "LiPo battery",
    does: "A 3S pack for a 450: 11.1 V nominal, 2200 mAh on the Blade 450 3D.",
    figure: "About 6 minutes",
    detail:
      "The Blade 450 manual sets the transmitter's timer to 6 minutes, 5 for hard flying and up to 8 if you only hover. Land with charge to spare.",
  },
  {
    id: "canopy",
    name: "Canopy",
    does: "The painted shell over the nose. It keeps wind and grass off the electronics.",
    figure: "Two grommets",
    detail:
      "It pops onto two posts on the frame, so it comes off in a second for a battery swap. Bright colours help you read which way the helicopter is facing.",
  },
  {
    id: "tail",
    name: "Tail boom and drive",
    does: "Carries the tail rotor about half a metre back and drives it from the main gear.",
    figure: "4.07 turns per rotor turn",
    detail:
      "On the Align 450L a 106-tooth gear drives a 26-tooth tail gear, so the tail always turns in step with the main rotor, about four times as fast.",
  },
  {
    id: "tailrotor",
    name: "Tail rotor",
    does: "Pushes sideways to stop the body spinning against the main rotor's torque.",
    figure: "Pitch sets the push",
    detail:
      "Its speed is tied to the main rotor, so the tail changes its push by changing pitch. Even with the stick centred its blades sit at some positive pitch: Fig 3 shows why.",
  },
  {
    id: "tailservo",
    name: "Tail servo",
    does: "Sets the tail blades' pitch through a long pushrod down the boom.",
    figure: "270 Hz and up",
    detail:
      "The gyro corrects the tail constantly, so the tail servo has to be fast. The Microbeast manual asks for one that handles at least 270 Hz.",
  },
  {
    id: "skids",
    name: "Landing skids",
    does: "Two tubes on a plastic gear that the helicopter sits and lands on.",
    figure: "A wide stance",
    detail:
      "The width keeps it from tipping on touchdown. For first hovers many pilots bolt on training gear: crossed sticks with balls on the ends.",
  },
];

const THEN_NOW = [
  [
    "Power",
    "A .60 glow engine; electric flight was still an experiment",
    "A brushless motor and a LiPo pack, 3S on a 450 up to 12S on a 700",
  ],
  [
    "Stabilisation",
    "A flybar with paddles, and a tail gyro with a spinning wheel",
    "A three-axis flybarless unit with a heading-hold tail",
  ],
  [
    "Radio",
    "72 MHz, one frequency pin per channel at the field",
    "2.4 GHz spread spectrum, no pins",
  ],
  [
    "Head",
    "Collective by a wire in a grooved shaft, or none at all",
    "120° CCPM on three servos; the sticks ask for rates of rotation",
  ],
  [
    "Learning",
    "Hovering on a tether, and a lot of crashes",
    "A simulator first, then self-levelling and panic-recovery modes",
  ],
] as const;

const FULL_UP = sweepOf({ collective: 1, cyclic: 0 });
const FULL_FORWARD = sweepOf({ collective: 0, cyclic: 1 });

export default function RcHelicoptersGuide() {
  return (
    <article>
      <header className={`${COLUMN} pt-10 text-center sm:pt-14`}>
        <p className="font-semibold">
          <Link href="/guides" className="underline underline-offset-4">
            Guides
          </Link>
        </p>
        <h1 className="mt-4 text-4xl leading-[0.92] font-black tracking-tight text-balance font-wide sm:text-6xl">
          The RC helicopter, taken apart.
        </h1>
        <p className="mt-5 text-lg text-pretty">
          Fifty years of learning to hover, every part of a modern 450, and benches you can drive
          yourself: the swashplate, the tail and the hover. By the SunTzu RC crew, about 15 minutes.
        </p>
      </header>

      <HeliApartStage figure={<HeliApartFigure />} />

      <Prose className="pb-20">
        <p>
          A helicopter has no wing to lean on. Its wing is the rotor, and it only works while it
          spins: around 45 turns a second on a 450, with each blade changing its angle as it goes
          round. Flying one means steering that spinning disc, and stopping the body from spinning
          with it.
        </p>
        <p>
          We&apos;ll start with the people who first got one off the ground, follow your stick
          through the swashplate, go part by part through a modern 450, and finish with the two
          things every helicopter pilot learns early: why it needs a tail, and where the hover is.
        </p>
      </Prose>

      <section aria-labelledby="history" className="bg-background py-20">
        <Column>
          <SectionTitle id="history">Where it started</SectionTitle>
          <p className="mx-auto mt-5 max-w-[60ch] text-center text-lg text-pretty">
            Scroll through the milestones. Each one links to where we checked it.
          </p>
        </Column>
        <Wide className="mt-14">
          <Timeline items={HELI_HISTORY} label="Milestones in radio-controlled helicopters" />
        </Wide>
      </section>

      <section aria-labelledby="swashplate" className="py-20">
        <Column>
          <SectionTitle id="swashplate">From stick to swashplate</SectionTitle>
        </Column>
        <Prose className="mt-8">
          <p>
            A helicopter&apos;s two sticks do two very different things. The collective stick adds
            pitch to both blades at once, so the whole disc lifts more. The cyclic stick tilts the
            disc, and the helicopter goes the way the disc leans. Both reach the blades through one
            part, the swashplate:{" "}
            <a href={SOURCES.guide}>raise it for collective, tilt it for cyclic</a>.
          </p>
          <p>
            Its bottom ring sits on three servos and doesn&apos;t turn. Its top ring turns with the
            head and pushes a link up to each blade&apos;s grip. Raise the plate and both links rise
            together. Tilt it, and each link rides up one side and down the other as the head goes
            round. Move across the bench below, or tab to it and use the arrow keys.
          </p>
        </Prose>
        <Column className="mt-12">
          <SwashplateFigure fig="Fig 2" />
        </Column>
        <Prose className="mt-12">
          <p>
            At full collective both blades on Fig 2 reach about +{FULL_UP.high.toFixed(0)}°. At full
            cyclic the plate tilts {CYCLIC_DEG}° and each blade swings from −
            {Math.abs(FULL_FORWARD.low).toFixed(0)}° to +{FULL_FORWARD.high.toFixed(0)}° and back
            once per turn: more bite on one side of the disc, less on the other, so the disc tilts.
            Real setups are close: the <a href={SOURCES.blade450}>Blade 450 3D&apos;s manual</a>{" "}
            sets ±10° or ±12° of collective, and{" "}
            <a href={SOURCES.microbeast}>3D pilots run 10 to 12° of cyclic</a>.
          </p>
          <p>
            <strong>Your radio does the mixing.</strong> No one servo is &quot;elevator&quot; or
            &quot;pitch&quot;. The transmitter, or the flybarless unit, works out how far each of
            the three must move for every combination of sticks. That&apos;s what{" "}
            <a href={SOURCES.ccpm}>CCPM</a> means, and it&apos;s why a helicopter is set up on the
            bench before it ever flies.
          </p>
        </Prose>
      </section>

      <section aria-labelledby="parts" className="bg-background py-20">
        <Column>
          <SectionTitle id="parts">Every part, and what it does</SectionTitle>
          <p className="mx-auto mt-5 max-w-[60ch] text-center text-lg text-pretty">
            A typical electric 450, from the blade tips in. Scroll and watch the part light up on
            the helicopter.
          </p>
        </Column>
        <Wide className="mt-14">
          <HeliExplorer parts={PARTS} />
        </Wide>
      </section>

      <section aria-labelledby="tail" className="py-20">
        <Column>
          <SectionTitle id="tail">Why it needs a tail</SectionTitle>
        </Column>
        <Prose className="mt-8">
          <p>
            The motor turns the rotor one way, and the rotor turns the body the other way. Left
            alone, the helicopter would spin under its own blades. The tail rotor stops it by
            pushing sideways at the end of the boom, and{" "}
            <a href={SOURCES.guide}>a coaxial helicopter does it with a second rotor</a> turning the
            other way.
          </p>
          <p>
            The bench below sets a 450&apos;s body on a turntable with a spring, so the torque shows
            up as a twist. Drag across it to change the tail rotor&apos;s pitch, and find where the
            pointer reads zero.
          </p>
        </Prose>
        <Column className="mt-12">
          <TailTorqueFigure fig="Fig 3" />
        </Column>
        <Prose className="mt-12">
          <p>
            At about {TAIL_PITCH}° of tail pitch the tail pushes {NEEDED.toFixed(1)} N, and the
            torque and the push cancel. That&apos;s why{" "}
            <a href={SOURCES.microbeast}>
              a helicopter&apos;s tail blades sit at some positive pitch even with the stick centred
            </a>
            .
          </p>
          <p>
            <strong>That balance moves all the time.</strong> Add collective and the main rotor
            needs more torque; take it away and it needs less. So the flybarless unit&apos;s
            heading-hold gyro senses the yaw and trims the tail pitch for you. The Microbeast talks
            to its tail servo up to 560 times a second, which is why a good tail servo is fast.
          </p>
        </Prose>
      </section>

      <section aria-labelledby="hover" className="py-20">
        <Column>
          <SectionTitle id="hover">Finding the hover</SectionTitle>
        </Column>
        <Prose className="mt-8">
          <p>
            On a helicopter the headspeed stays put and the collective does what the throttle does
            on a plane. More pitch, more lift. Strap a 450 to a bench scale and you can watch the
            rotor take the weight off it.
          </p>
        </Prose>
        <Column className="mt-12">
          <HoverBenchFigure fig="Fig 4" />
        </Column>
        <Prose className="mt-12">
          <p>
            The {WEIGHT} g helicopter reads less and less as the pitch comes in, and at about +
            {HOVER_PITCH}° the scale reads zero: the rotor is carrying all of it. That&apos;s about
            where <a href={SOURCES.trex450se}>a T-Rex 450 hovers</a>. A little more and it climbs, a
            little less and it settles.
          </p>
          <p>
            <strong>Hover is a balance, not a setting.</strong> Wind, a fresh or a tired battery and
            the thin air of a hot Florida afternoon all move it. That&apos;s why first lessons are
            all hovering: small, constant corrections, one control at a time.
          </p>
        </Prose>
      </section>

      <section aria-labelledby="then-now" className="py-20">
        <Column>
          <SectionTitle id="then-now">Then and now</SectionTitle>
          <p className="mx-auto mt-5 max-w-[60ch] text-center text-lg text-pretty">
            A club helicopter from around 1980 and a 450 you could buy this weekend. The physics is
            the same; almost everything else changed.
          </p>
        </Column>
        <Wide className="mt-12">
          <div className="overflow-x-auto rounded-xl border-2 border-foreground bg-panel shadow-hard-lg">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <caption className="sr-only">
                An RC helicopter around 1980 compared with one today
              </caption>
              <thead>
                <tr className="border-b-2 border-foreground">
                  <th scope="col" className="p-4 font-semibold">
                    <span className="sr-only">Aspect</span>
                  </th>
                  <th scope="col" className="p-4 text-xl font-black font-wide">
                    Around 1980
                  </th>
                  <th scope="col" className="bg-primary p-4 text-xl font-black font-wide">
                    Today
                  </th>
                </tr>
              </thead>
              <tbody>
                {THEN_NOW.map(([aspect, then, now]) => (
                  <tr key={aspect} className="border-b-2 border-foreground last:border-b-0">
                    <th scope="row" className="p-4 align-top font-bold">
                      {aspect}
                    </th>
                    <td className="p-4 align-top text-pretty">{then}</td>
                    <td className="bg-primary/25 p-4 align-top text-pretty">{now}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            From Model Aviation&apos;s helicopter columns (1978 to 2014), the{" "}
            <a href={SOURCES.flybar} className="underline underline-offset-4">
              flybarless explainer
            </a>{" "}
            and today&apos;s manuals.
          </p>
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
            A 450 weighs about {WEIGHT} g, well over the FAA&apos;s 250 g line, so the rules are the
            same as for a plane: pass the free TRUST test, register for $5, and fly with Remote ID
            or at a recognised club field.{" "}
            <Link href="/guides/flying-legally">The full rules, with sources</Link>.
          </p>
          <p>
            Then start in a simulator. Every crash there is free, and{" "}
            <a href={SOURCES.guide}>Model Aviation&apos;s helicopter guide</a> recommends one too.
            When you&apos;re ready for the real thing, we&apos;ll set it up on the bench like Fig 2
            and stand next to you for the first hovers.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/contact?topic=lessons">Book a first hover</Link>
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
