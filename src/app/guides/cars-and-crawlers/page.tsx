import type { Metadata } from "next";
import Link from "next/link";
import { CarApartFigure } from "@/components/figures/car-apart/figure";
import { CarApartStage } from "@/components/figures/car-apart/stage";
import { DiffFigure } from "@/components/figures/diff/figure";
import { axleAt } from "@/components/figures/diff/model";
import { GearingFigure } from "@/components/figures/gearing/figure";
import { INTERNAL, SPUR, STOCK, STOCK_PINION, speedOn } from "@/components/figures/gearing/model";
import { ShockFigure } from "@/components/figures/shock/figure";
import { STOCK_CST, dropOf } from "@/components/figures/shock/model";
import { CarExplorer, type CarPart } from "@/components/guides/car-explorer";
import { COLUMN, Column, Prose, SectionTitle, Wide } from "@/components/guides/prose";
import { Timeline } from "@/components/guides/timeline";
import { Button } from "@/components/ui/button";
import { CAR_HISTORY } from "@/content/car-history";
import { PLACES } from "@/content/places";

export const metadata: Metadata = {
  title: "Cars and crawlers, taken apart",
  description:
    "How radio-control cars went from toy shops to world championships, what every part of a short-course truck does, and benches you can drive yourself: the differential, the shocks and the gearing.",
};

const PARTS: CarPart[] = [
  {
    id: "chassis",
    name: "Chassis",
    does: "The tub that everything else bolts to, with a bumper at each end.",
    figure: "538 mm long",
    detail:
      "A short-course truck is long and wide for its class: the Team Associated Pro2 SC10 is 538 mm long and 282 mm wide on a 322 mm wheelbase, and weighs 1928 g ready to run.",
  },
  {
    id: "body",
    name: "Body shell",
    does: "A replica of a full-size short-course race truck, held on by clips.",
    figure: "Off in seconds",
    detail:
      "It keeps dirt off the electronics and, on a short-course truck, covers the tyres like the real thing. Take it off first for anything you do on the bench.",
  },
  {
    id: "tyres",
    name: "Wheels and tyres",
    does: "Grip, mostly. On dirt, the tyre matters more than almost anything else you can change.",
    figure: "About 110 mm",
    detail:
      "Makers rarely publish short-course tyre sizes; a typical one, the Pro-Line Trencher X, is 110 mm tall and 47 mm wide. Each wheel sits on a hex hub and is held by one nut.",
  },
  {
    id: "arms",
    name: "Suspension arms",
    does: "Let each wheel move up and down on its own while the chassis stays level.",
    figure: "Four corners",
    detail:
      "Each arm pivots on the chassis at one end and carries a hub at the other. Fig 3 shows what happens when one of them drops over a bump.",
  },
  {
    id: "shocks",
    name: "Shocks",
    does: "A spring to hold the truck up, and a piston in oil to stop it bouncing.",
    figure: `${STOCK_CST} cSt stock`,
    detail:
      "The Pro2 SC10 ships with 30wt oil front and rear, which is 350 cSt in Team Associated's oil. Fig 3 lets you try thinner and thicker.",
  },
  {
    id: "steering",
    name: "Steering",
    does: "A servo turns the front wheels through a servo saver and two links.",
    figure: "Servo saver",
    detail:
      "The saver is a spring-loaded arm on the servo. When a front wheel hits something hard, it gives instead of stripping the servo's gears.",
  },
  {
    id: "motor",
    name: "Brushless motor",
    does: "Turns battery power into spin, with no brushes to wear out.",
    figure: "3300 kV",
    detail:
      "kV is rpm per volt with nothing attached: 3300 kV on a 7.4 V pack is about 24,400 rpm unloaded. Under load it turns slower, which is why top-speed sums are theoretical.",
  },
  {
    id: "gears",
    name: "Pinion and spur",
    does: "The first step down: a small gear on the motor drives a big one on the transmission.",
    figure: `${STOCK_PINION}T and ${SPUR}T`,
    detail:
      "Change the pinion and you change the truck's gearing. Fig 4 shows what one tooth more or less does to speed.",
  },
  {
    id: "transmission",
    name: "Transmission and diff",
    does: "Gears the spur down again and splits the drive between the rear wheels.",
    figure: `${INTERNAL}:1 inside`,
    detail:
      "Inside is the differential that lets the rear wheels turn at different speeds in a corner. Fig 2 takes it apart.",
  },
  {
    id: "driveshafts",
    name: "Driveshafts",
    does: "Carry the drive from the transmission out to each rear hub while the suspension moves.",
    figure: "Two-wheel drive",
    detail:
      "Many short-course trucks come in two- and four-wheel-drive versions. Four-wheel drive adds shafts and a diff at the front, and often one in the middle.",
  },
  {
    id: "esc",
    name: "Speed controller (ESC)",
    does: "Turns your throttle into motor power, forwards, braking and reverse.",
    figure: "LiPo cutoff",
    detail:
      "Modern ones have a low-voltage cutoff that eases off the motor before a LiPo pack drops too low. Make sure it's switched on if you run LiPo.",
  },
  {
    id: "receiver",
    name: "Receiver",
    does: "Listens to your transmitter on 2.4 GHz and sends the servo and ESC their signals.",
    figure: "2.4 GHz",
    detail:
      "Some ready-to-run cars now have a gyro built into the receiver that helps catch a slide, a long way from the fixed-frequency radios of the eighties.",
  },
  {
    id: "battery",
    name: "LiPo battery",
    does: "Stores the energy, down the middle of the chassis where its weight does least harm.",
    figure: "2S = 7.4 V",
    detail:
      "Racing rules have required hard-case LiPo packs since ROAR first allowed them. Balance charge, never leave a pack charging unattended, and store it around 3.8 V per cell.",
  },
];

const THEN_NOW = [
  ["Motor", "A brushed motor", "A 3300 kV brushless motor"],
  ["Battery", "A six-cell NiCd pack", "A 2S or 3S LiPo"],
  [
    "Radio",
    "A fixed frequency: two cars couldn't share a channel",
    "2.4 GHz, with a gyro in the receiver",
  ],
  [
    "Chassis",
    "Gold-anodised aluminium tub, ball diff, oil shocks",
    "Moulded composite chassis, sealed gear diff, 12 mm big-bore shocks",
  ],
  [
    "Speed control",
    "A resistor and wiper speed control",
    "A brushless ESC with a LiPo low-voltage cutoff",
  ],
] as const;

const FULL_LOCK = axleAt(1);
const STOCK_DROP = dropOf(STOCK_CST);
const TRACKS = PLACES.filter((place) => place.kind === "Car track");
const coralSprings = TRACKS.find((place) => place.name.startsWith("Coral Springs"));
const delray = TRACKS.find((place) => place.name.startsWith("West Delray"));

export default function CarsGuide() {
  return (
    <article>
      <header className={`${COLUMN} pt-10 text-center sm:pt-14`}>
        <p className="font-semibold">
          <Link href="/guides" className="underline underline-offset-4">
            Guides
          </Link>
        </p>
        <h1 className="mt-4 text-4xl leading-[0.92] font-black tracking-tight text-balance font-wide sm:text-6xl">
          Cars and crawlers, taken apart.
        </h1>
        <p className="mt-5 text-lg text-pretty">
          Sixty years of radio cars, every part of a short-course truck, and benches you can drive
          yourself. By the Servo crew, about 15 minutes.
        </p>
      </header>

      <CarApartStage figure={<CarApartFigure />} />

      <Prose className="pb-20">
        <p>
          A radio-control car is the easiest way into the hobby and one of the deepest. There is no
          airspace to learn and nothing to fall out of the sky. But under the body of a short-course
          truck sit the same ideas as in a real one: a differential, a spring and a damper at every
          corner, and gearing that trades speed for pull.
        </p>
        <p>
          We&apos;ll start with where it came from, take those three apart on the bench, then go
          part by part through what you&apos;ll actually buy.
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
          <Timeline items={CAR_HISTORY} label="Milestones in radio-controlled cars" />
        </Wide>
      </section>

      <section aria-labelledby="diff" className="py-20">
        <Column>
          <SectionTitle id="diff">Why the wheels turn at different speeds</SectionTitle>
        </Column>
        <Prose className="mt-8">
          <p>
            In a corner the outside wheels travel a bigger circle than the inside ones in the same
            time, so they have to turn faster. Fix both rear wheels to one shaft and one of them has
            to skid. A{" "}
            <a href="https://www.britannica.com/technology/differential-gear">differential</a> fixes
            that. The drive turns a ring gear on the diff&apos;s case; inside, small bevel gears
            called spiders mesh with a side gear on each axle. Going straight, the whole lot turns
            as one. In a corner the spiders turn on their pin, and each wheel follows its own path
            while the case runs at the average of the two.
          </p>
          <p>Steer the bench below, or tab to it and use the arrow keys.</p>
        </Prose>
        <Column className="mt-12">
          <DiffFigure fig="Fig 2" />
        </Column>
        <Prose className="mt-12">
          <p>
            At full lock on Fig 2 the inside wheel slows to{" "}
            {Math.round(Math.min(FULL_LOCK.left, FULL_LOCK.right))} rpm and the outside one speeds
            up to {Math.round(Math.max(FULL_LOCK.left, FULL_LOCK.right))} rpm, while the ring gear
            keeps turning at {Math.round(FULL_LOCK.carrier)}. Nothing skids.
          </p>
          <p>
            <strong>The catch is the slipping wheel.</strong> An open diff splits the torque
            equally, so when one wheel loses grip, the other gets no more than the slipping one can
            take: lift a wheel and it spins while the truck sits still. A limited-slip diff resists
            that; the 1984 RC10 had an adjustable ball diff. Rock crawlers go further and{" "}
            <a href="https://www.axialadventure.com/product/axial-1-10-scx10-iii-base-camp-4x4-rock-crawler-brushed-rtr/AXI03027.html">
              lock their diffs
            </a>
            , so both wheels on an axle always turn together. It climbs far better and turns worse,
            because in a corner one tyre has to scrub.
          </p>
        </Prose>
      </section>

      <section aria-labelledby="parts" className="bg-background py-20">
        <Column>
          <SectionTitle id="parts">Every part, and what it does</SectionTitle>
          <p className="mx-auto mt-5 max-w-[60ch] text-center text-lg text-pretty">
            A two-wheel-drive short-course truck with its body off, from the bumpers in. Scroll and
            watch the part light up on the truck.
          </p>
        </Column>
        <Wide className="mt-14">
          <CarExplorer parts={PARTS} />
        </Wide>
      </section>

      <section aria-labelledby="shocks" className="py-20">
        <Column>
          <SectionTitle id="shocks">Springs hold it up, oil calms it down</SectionTitle>
        </Column>
        <Prose className="mt-8">
          <p>
            A spring alone would let the truck land a jump and keep bouncing. The other half of a{" "}
            <a href="https://www.britannica.com/technology/shock-absorber">shock absorber</a> stops
            that: a piston on the shaft is pushed through oil, and the oil has to squeeze through
            small holes in it. The harder you push, the harder it pushes back.
          </p>
          <p>
            The bench below drops one corner of a truck from 20 mm, the way you&apos;d drop it on
            the bench to check it. Change the oil and watch the chart.
          </p>
        </Prose>
        <Column className="mt-12">
          <ShockFigure fig="Fig 3" />
        </Column>
        <Prose className="mt-12">
          <p>
            With the stock oil the corner dips {STOCK_DROP.overshoot.toFixed(1)} mm past where it
            settles and is still within a millimetre after {STOCK_DROP.settle?.toFixed(2)} s. Thin
            oil lets it pogo; thick oil stops the bounce but makes the wheel slow to come back down,
            and on a rough track it can&apos;t keep up with the next bump.
          </p>
          <p>
            <strong>Compare oils in centistokes.</strong> Shock oil is sold by weight, but{" "}
            <a href="https://www.rccaraction.com/?p=285883">
              one brand&apos;s 30wt isn&apos;t another&apos;s
            </a>
            ; centistokes (cSt) are the same everywhere. Team Associated&apos;s oils run from 25wt
            (275 cSt) to{" "}
            <a href="https://www.bigsquidrc.com/team-associated-announces-shock-oils-in-new-large-4-oz-bottles/">
              50wt (650 cSt)
            </a>
            . The piston matters as much as the oil:{" "}
            <a href="https://www.rccaraction.com/?p=235155">
              bigger or more holes make a shock softer
            </a>
            , fewer or smaller ones make it firmer.
          </p>
        </Prose>
      </section>

      <section aria-labelledby="gearing" className="py-20">
        <Column>
          <SectionTitle id="gearing">Gearing for speed</SectionTitle>
        </Column>
        <Prose className="mt-8">
          <p>
            A motor spins far faster than the wheels can, so gears bring it down twice: a small
            pinion on the motor drives a big spur gear, and the transmission reduces again inside.
            Multiply the two and you get the{" "}
            <a href="https://apps.associatedelectrics.com/ateamapps/vehicle_tuning/fdr/index.html">
              final drive ratio
            </a>
            . On the Pro2 SC10 that&apos;s {SPUR} ÷ {STOCK_PINION} × {INTERNAL} ={" "}
            {STOCK.fdr.toFixed(2)}:1.
          </p>
        </Prose>
        <Column className="mt-12">
          <GearingFigure fig="Fig 4" />
        </Column>
        <Prose className="mt-12">
          <p>
            Divide the tyre&apos;s circumference by the final drive and you get{" "}
            <a href="https://www.hobbywingdirect.com/blogs/news/14868017-r-c-101-pinion-gears-fdr">
              rollout
            </a>
            : how far the truck moves for one turn of the motor, {STOCK.rollout.toFixed(1)} mm with
            the stock pinion. More teeth on the pinion mean more rollout and more speed, and more
            work for the motor on every metre.
          </p>
          <p>
            <strong>Those speeds are a ceiling, not a promise.</strong> A motor&apos;s{" "}
            <a href="https://www.rccaraction.com/?p=285977">
              kV is its rpm per volt with nothing attached
            </a>
            , so the truck on the ground is slower than the sum. Put a 3S pack in and the voltage
            goes up by half; the manual then asks for a 17-tooth pinion, which on paper gives about{" "}
            {Math.round(speedOn(17, 11.1))} km/h and keeps the motor&apos;s load in check.
          </p>
        </Prose>
      </section>

      <section aria-labelledby="crawlers" className="bg-background py-20">
        <Prose>
          <SectionTitle id="crawlers">Crawlers: the slow end</SectionTitle>
          <p className="mt-8">
            A rock crawler turns everything above around. The{" "}
            <a href="https://www.axialadventure.com/product/axial-1-10-scx10-iii-base-camp-4x4-rock-crawler-brushed-rtr/AXI03027.html">
              Axial SCX10 III Base Camp
            </a>{" "}
            has a brushed 35-turn motor, a 14-tooth pinion on a 52-tooth spur and a final drive of
            45.6:1, about 3.6 times the reduction of the short-course truck, on{" "}
            <a href="https://liverc.com/news/axial-racing-releases-new-officially-licensed-19-falken-wildpeak-mud-terrain-tires">
              119 mm tyres
            </a>{" "}
            with both diffs locked. It is built to creep up a rock face at walking pace and stop
            exactly where you let go.
          </p>
          <p>
            Crawling became its own category in 2007, when Axial released the AX10, which it calls
            the first purpose-built RC rock crawler. Before that, people built crawlers from the
            parts of several kits.
          </p>
        </Prose>
      </section>

      <section aria-labelledby="then-now" className="py-20">
        <Column>
          <SectionTitle id="then-now">Then and now</SectionTitle>
          <p className="mx-auto mt-5 max-w-[60ch] text-center text-lg text-pretty">
            A late-eighties Team Associated RC10 kit and the RB10 you can buy ready to run today do
            the same job. Almost everything else changed.
          </p>
        </Column>
        <Wide className="mt-12">
          <div className="overflow-x-auto rounded-xl border-2 border-foreground bg-panel shadow-hard-lg">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <caption className="sr-only">A 1980s RC10 buggy compared with a buggy today</caption>
              <thead>
                <tr className="border-b-2 border-foreground">
                  <th scope="col" className="p-4 font-semibold">
                    <span className="sr-only">Aspect</span>
                  </th>
                  <th scope="col" className="p-4 text-xl font-black font-wide">
                    1980s
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
          <p className="mx-auto mt-5 max-w-[64ch] text-center text-sm text-pretty text-muted-foreground">
            Sources:{" "}
            <a
              className="underline underline-offset-4"
              href="https://apps.associatedelectrics.com/ateamapps/vehicle_reference/rc10-evolution/pages/evolution-of-rc10-buggy.html"
            >
              the RC10&apos;s history
            </a>
            ,{" "}
            <a
              className="underline underline-offset-4"
              href="https://www.associatedelectrics.com/news/latest_products/2484-new-rb10-ready-to-run-race-buggy/"
            >
              the RB10
            </a>{" "}
            and{" "}
            <a
              className="underline underline-offset-4"
              href="https://www.horizonhobby.com/hh-our-history/"
            >
              the switch to 2.4 GHz
            </a>
            .
          </p>
        </Wide>
      </section>

      <section aria-labelledby="florida" className="pb-24">
        <Prose>
          <h2
            id="florida"
            className="text-center text-3xl font-black text-balance font-wide sm:text-4xl"
          >
            Driving one in South Florida
          </h2>
          <p className="mt-5">
            There&apos;s no FAA paperwork for a car. You need somewhere to drive it.{" "}
            {coralSprings ? (
              <>
                <a href={coralSprings.url}>{coralSprings.name}</a>,{" "}
                {coralSprings.where.toLowerCase()}, runs ROAR-sanctioned off-road and on-road racing
              </>
            ) : null}
            {delray ? (
              <>
                , and <a href={delray.url}>{delray.name}</a> in {delray.where} has an RC car track
                alongside its flying field
              </>
            ) : null}
            . Parks and parking lots have their own rules, so ask before you bash.
          </p>
          <p>
            Or let us walk you through it. We&apos;ll help pick the truck, set its gearing and
            shocks on the bench like Figs 3 and 4, and come to the track for the first run.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/contact?topic=lessons">Book a lesson</Link>
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
