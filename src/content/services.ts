/** What the Servo crew offers. Shown on /learn and summarised on the home page. */

export const TOPICS = [
  { value: "lessons", label: "Lessons" },
  { value: "first-model", label: "Picking a first model" },
  { value: "advanced", label: "An advanced course" },
  { value: "connect", label: "Shops, clubs and tracks" },
  { value: "rules", label: "Rules and permits" },
  { value: "event", label: "An event to list" },
  { value: "other", label: "Something else" },
] as const;

export type Topic = (typeof TOPICS)[number]["value"];

export const SERVICES = [
  {
    id: "lessons",
    cta: "Book a lesson",
    short: "Lessons",
    title: "Lessons at the field",
    lead: "One-on-one, on a real field or track, with your model or ours.",
    points: [
      "Planes start on a buddy box: your transmitter is linked to ours, and we can take over in a heartbeat.",
      "Helicopters start with hovering drills, one control at a time.",
      "Cars start with throttle control and lines, then setups that suit the surface.",
    ],
  },
  {
    id: "first-model",
    cta: "Help me pick a model",
    short: "First model",
    title: "Your first model, chosen right",
    lead: "Tell us your budget and where you'll run it. We'll shortlist, then set it up with you.",
    points: [
      "Ready-to-fly versus bind-and-fly versus kit, explained without the jargon.",
      "We check binding, control directions, failsafe and balance before day one.",
      "A charger and LiPo routine you'll actually stick to.",
    ],
  },
  {
    id: "advanced",
    cta: "Ask about a course",
    short: "Advanced",
    title: "Advanced courses",
    lead: "For when the basics are boring and you want the next thing.",
    points: [
      "Aerobatics and precision patterns, then 3D if you dare.",
      "Helicopters from hover to forward flight, then inverted.",
      "Car setup and tuning: gearing, shocks, tyres and diffs.",
    ],
  },
  {
    id: "connect",
    cta: "Introduce me to the scene",
    short: "The scene",
    title: "Plugged into the scene",
    lead: "We know the shops, clubs and tracks from Palm Beach to the Keys.",
    points: [
      "Introductions to clubs with instructors and insured fields.",
      "Which hobby shops stock parts for what, and who repairs what.",
      "Fly-ins, races and shows worth driving to.",
    ],
  },
  {
    id: "rules",
    cta: "Help me with the rules",
    short: "Rules",
    title: "Rules and permits, sorted",
    lead: "South Florida has a lot of busy airspace. We'll help you fly legally and stay welcome.",
    points: [
      "The FAA's TRUST test and registration, step by step.",
      "Remote ID, and where you can fly without it.",
      "Which parks allow what, and why clubs are usually the easy answer.",
    ],
  },
] as const;

/** The path from first message to first flight. A real sequence, so it is numbered. */
export const STEPS = [
  {
    title: "Tell us what you want to do",
    body: "Fly, hover or drive, total beginner or rusty. A few lines is enough.",
  },
  {
    title: "We plan it with you",
    body: "Which model, which field or track, what to bring, and what it costs.",
  },
  {
    title: "Meet us at the field",
    body: "We bring the buddy box, spare props and patience.",
  },
] as const;
