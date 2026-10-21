import type { Milestone } from "@/components/guides/timeline";

/** RC helicopter history, checked against the sources linked on 2026-10-21. */
export const HELI_HISTORY: Milestone[] = [
  {
    year: "c. 1931",
    title: "A balsa model starts the story",
    body: "Guinness World Records lists Arthur M. Young's balsa and rubber-band model, built around 1931, as the first RC helicopter. His later models flew on electrical remote control, and his big idea was a stabilizer bar that kept the rotor steady enough to hover.",
    source: {
      label: "Guinness World Records: first RC helicopter",
      href: "https://www.guinnessworldrecords.com/world-records/385533-first-remote-controlled-rc-helicopter",
    },
  },
  {
    year: "1969",
    title: "A 5.5-second flight wins a prize",
    body: "A German industrialist offered $2,800 in prizes to the first pilot who could fly a model helicopter by radio. Dieter Schlüter won it in 1969 with a flight of 5.5 seconds.",
    source: {
      label: "AMA History Project: Ernie Huber",
      href: "https://www.modelaircraft.org/sites/default/files/files/HuberErnestFrederickErnie.pdf",
    },
  },
  {
    year: "1970",
    title: "David Gray flies one in Cincinnati",
    body: "At the 1970 RC show in Cincinnati, David Gray flew his .40-powered RC helicopter, which then made the cover of Model Airplane News. The AMA credits him with the first RC helicopter flight, and the Smithsonian holds his model.",
    source: {
      label: "AMA History Project: David Gray",
      href: "https://www.modelaircraft.org/sites/default/files/files/GrayDavid.pdf",
    },
  },
  {
    year: "1971",
    title: "The first kits go on sale",
    body: "Schlüter was the first to make and sell an RC helicopter kit: a semi-scale Bell Huey Cobra with a fibreglass body and machined mechanics. Horace Hagen got one of the first 50 in April 1971, the first RC helicopter kit in the US.",
    source: {
      label: "Model Aviation: Horace Hagen's Cobra",
      href: "https://www.modelaviation.com/node/1446",
    },
  },
  {
    year: "1978",
    title: "Collective pitch arrives in kits",
    body: "Schlüter's Heli-Boy was a bolt-together kit with a .60 glow engine that weighed 8.5 pounds. It had collective pitch, which changes the angle of both main blades at once, plus tail-rotor mixing.",
    source: {
      label: "Model Aviation: RC helicopters, March 1978",
      href: "https://library.modelaviation.com/article/radio-control-helicopters-29",
    },
  },
  {
    year: "1985",
    title: "The first world championships",
    body: "The FAI gave RC helicopters world-championship status in 1983. The first F3C championships were held in London, Ontario, in July 1985, and Japan's Shigetada Taya won the individual title.",
    source: {
      label: "Model Aviation: first RC helicopter worlds",
      href: "https://www.modelaviation.com/article/first-rc-helicopter-world-championships",
    },
  },
  {
    year: "1989",
    title: "A helicopter built for newcomers",
    body: "Kyosho asked world champion Shigetada Taya to design the Concept 30: easy to maintain, tough in a crash and friendly to fly. It came as the DX trainer and the SE for aerobatics.",
    source: {
      label: "Model Aviation: RC helicopters, August 1989",
      href: "https://library.modelaviation.com/article/radio-control-helicopters-133",
    },
  },
  {
    year: "2000",
    title: "Piezo gyros replace spinning wheels",
    body: "Early tail gyros used spinning wheels that ate battery power. By 2000, Model Aviation was describing piezo gyros with no moving parts that sense yaw and correct the tail servo about ten times faster.",
    source: {
      label: "Model Aviation: RC helicopters, January 2000",
      href: "https://library.modelaviation.com/article/rc-helicopters-6",
    },
  },
  {
    year: "2001",
    title: "Work starts on the electronic flybar",
    body: "Ulrich Röhr started VBar in 2001 as a private project to replace the mechanical flybar with electronics, and Mikado has built and sold it ever since. Mikado calls it the first flybarless system with a built-in tail gyro.",
    source: { label: "Mikado: 20 years of VBar", href: "https://www.vstabi.info/en/20_years_vbar" },
  },
  {
    year: "c. 2004",
    title: "The T-Rex 450 makes small electrics popular",
    body: "Writing in 2007, Model Aviation said Align's T-Rex 450 had arrived about three years earlier and quickly became the small helicopter everyone wanted, on an electric outrunner and a 3S 11.1 V LiPo.",
    source: {
      label: "Model Aviation: Align T-Rex 450SE, June 2007",
      href: "https://library.modelaviation.com/article/swash-plate-align-t-rex-450se-cde-200706",
    },
  },
  {
    year: "2007",
    title: "Coaxial helicopters for beginners",
    body: "E-flite's Blade CX came assembled, with two main rotors spinning in opposite directions to cancel torque, mostly for indoor flying. Model Aviation's 2007 review said almost any experienced RC pilot could fly one safely.",
    source: {
      label: "Model Aviation: E-flite Blade CX, May 2007",
      href: "https://library.modelaviation.com/article/swash-plate-e-flite-blade-cx",
    },
  },
  {
    year: "2013",
    title: "Freestyle 3D gets its own world title",
    body: "F3N, the FAI's freestyle class for RC helicopters, became an official class in 2010, and its first world championships were held in Germany in 2013.",
    source: { label: "FAI: CIAM history 2010–2019", href: "https://www-2025.fai.org/node/22190" },
  },
];
