// ============================================================
// GoLo — Practice Routine Data Model
// Source of truth. All session screens derive from this.
// ============================================================

export type BlockMetric = {
  label: string;
  target: string;
  inputType: 'fraction' | 'boolean' | 'text';
  numerator?: number;
  denominator?: number;
};

export type BlockType = {
  key: string;
  name: string;
  durationMin: number;
  description: string;
  swingKeyCritical: boolean; // tracks "sequence felt right?"
  metric?: BlockMetric;
  neverCut?: boolean;
  drills: string[];
};

export type DayRoutine = {
  day: 'tuesday' | 'wednesday' | 'thursday';
  focus: string;
  totalMinutes: number;
  swingKey: string;
  blocks: BlockType[];
};

export const ROUTINE: DayRoutine[] = [
  // ──────────────────────────────────────────────────────────
  // TUESDAY — Ball Striking
  // ──────────────────────────────────────────────────────────
  {
    day: 'tuesday',
    focus: 'Ball Striking',
    totalMinutes: 40,
    swingKey:
      'Lower body fires first. Hips bump/rotate before shoulders and hands move. Arms just come along for the ride.',
    blocks: [
      {
        key: 'tuesday_warmup',
        name: 'Warmup',
        durationMin: 4,
        description: 'No balls. Sequence awareness first.',
        swingKeyCritical: true,
        drills: [
          'Hip 90/90 rotations × 8 each side',
          'Thoracic spine windmills × 6',
          '3 slow-motion swings: feel hips bump/rotate before anything else — exaggerate it',
        ],
      },
      {
        key: 'tuesday_wedge_calibration',
        name: 'Wedge Calibration',
        durationMin: 10,
        description: '10 balls · contact and sequence only, no target',
        swingKeyCritical: true,
        drills: [
          '3 balls at 50%: feel core engage first, arms come along',
          '3 balls at 75%: same feeling, let speed build naturally',
          '4 balls at 100%: lock in carry number for today',
          'If arms outrun body → back to 50% and reset',
        ],
      },
      {
        key: 'tuesday_staircase',
        name: 'Staircase Drill',
        durationMin: 14,
        description: '18 balls · 9-iron through 4-iron · same alignment line throughout',
        swingKeyCritical: true,
        neverCut: false,
        drills: [
          '2 balls per club ascending: 9i → 8i → 7i → 6i → 5i → 4i',
          'First ball: feel the sequence (core fires, shoulders follow, hands last)',
          'Second ball: commit and trust it',
          'If a club blows up: one more ball max, then move on',
          'Note if longer clubs make you revert to arms',
        ],
      },
      {
        key: 'tuesday_pressure_finish',
        name: 'Pressure Finish',
        durationMin: 8,
        description: '6 balls · one shot per target · no do-overs',
        swingKeyCritical: true,
        neverCut: true,
        metric: {
          label: 'Targets Hit',
          target: '4/6 or better',
          inputType: 'fraction',
          numerator: 0,
          denominator: 6,
        },
        drills: [
          'Pick 6 targets at varied distances (e.g. 100, 130, 155, 175, 200, driver)',
          'One club, one ball, one shot each',
          'Win = starting line at or on target (distance secondary)',
          'Full pre-shot routine on every shot — game simulation',
          'Driver: normal tee height, 80% effort, sequence first',
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // WEDNESDAY — Short Game
  // ──────────────────────────────────────────────────────────
  {
    day: 'wednesday',
    focus: 'Short Game',
    totalMinutes: 34,
    swingKey: 'Forward shaft lean at contact on all chip shots. Never flip.',
    blocks: [
      {
        key: 'wednesday_lag_putting',
        name: 'Distance Control Putting',
        durationMin: 12,
        description: 'Lag putting focus',
        swingKeyCritical: false,
        metric: {
          label: '3-Putts from 30+ ft',
          target: 'Zero',
          inputType: 'boolean',
        },
        drills: [
          '5 balls from 30 feet: roll all to same hole, zero in on pace',
          'Ladder: one putt each from 20, 30, 40, 50 feet — each within 3 feet',
          'Eyes-closed drill: 5 putts from 10 feet, feel stroke length not target',
          '5 putts from 4 feet to close — never miss these',
        ],
      },
      {
        key: 'wednesday_chipping',
        name: 'Chipping Variety',
        durationMin: 12,
        description: 'Multiple lies, multiple clubs',
        swingKeyCritical: true,
        metric: {
          label: 'Circle Game',
          target: 'Clear all 5 (within 6 feet)',
          inputType: 'fraction',
          numerator: 0,
          denominator: 5,
        },
        drills: [
          'Tight lie drill: 8 balls off firm spot with 56° — control low point, no scooping',
          'Club variety: same chip location with PW, 9i, 7i — feel each release',
          'Circle game: chip to a hole, any ball outside 6 feet stays as mark — clear all 5',
          'Non-negotiable: forward shaft lean at contact — if you flip it, it does not count',
        ],
      },
      {
        key: 'wednesday_make_zone',
        name: 'Make Zone Putting',
        durationMin: 10,
        description: 'Holing putts under pressure',
        swingKeyCritical: false,
        neverCut: true,
        metric: {
          label: 'The Streak',
          target: '10 in a row from 4 feet',
          inputType: 'boolean',
        },
        drills: [
          'Arc drill: 6 balls around hole at 6 feet — make all 6 before moving',
          '2 breaking putts at 8-10 feet: one each direction, commit to read',
          'The Streak: 10 putts in a row from 4 feet. Every miss = restart from zero.',
          'Do not leave until the streak is done.',
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // THURSDAY — Scoring
  // ──────────────────────────────────────────────────────────
  {
    day: 'thursday',
    focus: 'Scoring',
    totalMinutes: 35,
    swingKey: 'Core fires first — even in partial swings. Body leads hands always.',
    blocks: [
      {
        key: 'thursday_quick_groove',
        name: 'Quick Groove',
        durationMin: 5,
        description: '10 balls · zero mechanics except one: core fires first',
        swingKeyCritical: true,
        drills: [
          '4 wedge shots: sequence check, feel body lead',
          '3 mid-iron shots: same',
          '3 driver shots: 80% effort, sequence over speed',
          'If arms start leading: stop, do one slow-motion swing to reset',
        ],
      },
      {
        key: 'thursday_gap_wedges',
        name: 'Gap Yardage Wedges',
        durationMin: 12,
        description: 'Own every 10 yards from 60–130',
        swingKeyCritical: true,
        metric: {
          label: 'Carries Within 15 ft',
          target: 'All 3 per yardage',
          inputType: 'text',
        },
        drills: [
          'Identify awkward yardages (likely 80, 95, 115)',
          "3 balls to each using clock-face lengths (9, 10, 11 o'clock)",
          'Land within 15 feet of intended carry = success',
          'Note anything that clicks — text yourself immediately',
          'Sequencing applies even at partial swings — body leads hands',
        ],
      },
      {
        key: 'thursday_five_hole_sim',
        name: '5-Hole Simulation',
        durationMin: 10,
        description: 'Play 5 imaginary holes, scored honestly',
        swingKeyCritical: false,
        neverCut: true,
        metric: {
          label: 'Score vs Par',
          target: 'Even or better',
          inputType: 'text',
        },
        drills: [
          'Mix of par 3, 4, 5 — use your home course',
          'Tee shot: real target, right club for the hole',
          'Approach: realistic yardage, commit to it',
          'Score par/bogey/birdie on contact + starting line',
        ],
      },
      {
        key: 'thursday_clutch_putting',
        name: 'Clutch Putting',
        durationMin: 8,
        description: 'Finish under pressure every Thursday',
        swingKeyCritical: false,
        neverCut: true,
        metric: {
          label: '6-foot Makes',
          target: '5/5 with full routine',
          inputType: 'fraction',
          numerator: 0,
          denominator: 5,
        },
        drills: [
          '5 putts from 6 feet with mild break — full pre-shot routine every time',
          'Track your makes',
          '3 putts from inside 4 feet — identical routine, never miss these',
          'Mantra: routine over results',
        ],
      },
    ],
  },
];

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

/** Get the DayRoutine for a given day string */
export function getRoutineForDay(
  day: 'tuesday' | 'wednesday' | 'thursday'
): DayRoutine | undefined {
  return ROUTINE.find((r) => r.day === day);
}

/** Determine today's practice day (null = rest day) */
export function getTodayPracticeDay(): 'tuesday' | 'wednesday' | 'thursday' | null {
  const dayIndex = new Date().getDay(); // 0=Sun, 2=Tue, 3=Wed, 4=Thu
  const map: Record<number, 'tuesday' | 'wednesday' | 'thursday'> = {
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
  };
  return map[dayIndex] ?? null;
}

/** Get the next upcoming practice day label */
export function getNextPracticeDay(): string {
  const today = new Date().getDay();
  if (today < 2) return 'Tuesday';
  if (today === 2) return 'Wednesday';
  if (today === 3) return 'Thursday';
  return 'Tuesday'; // Fri/Sat/Sun → next Tuesday
}
