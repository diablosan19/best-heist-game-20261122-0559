// The three floors of the Meridian Museum. Every level is plain data: the
// walls and cover that block movement and sight, the guards' patrol routes,
// the cameras' sweep arcs, the coins, the prize on its plinth, the thief's
// door and the green exit. The world is 1152 by 648, with a 28-pixel
// marble border the thief cannot cross.

export const WORLD_W = 1152;
export const WORLD_H = 648;
export const BORDER = 28;

export const LEVELS = [
  {
    name: 'The Amber Gallery',
    prize: 'Sun of Meridian',
    parSeconds: 75,
    start: { x: 70, y: 590 },
    exit: { x: 56, y: 44, w: 64, h: 40 },
    loot: { x: 1060, y: 324, name: 'Sun of Meridian' },
    walls: [
      // A low partition with two gaps: three ways across the hall.
      { x: 380, y: 28, w: 26, h: 220 },
      { x: 380, y: 400, w: 26, h: 220 },
      { x: 760, y: 28, w: 26, h: 180 },
      { x: 760, y: 430, w: 26, h: 190 },
    ],
    cover: [
      { x: 180, y: 130, w: 90, h: 46, kind: 'case' },
      { x: 180, y: 470, w: 90, h: 46, kind: 'case' },
      { x: 500, y: 280, w: 56, h: 56, kind: 'pillar' },
      { x: 500, y: 130, w: 90, h: 46, kind: 'case' },
      { x: 880, y: 130, w: 90, h: 46, kind: 'case' },
      { x: 880, y: 470, w: 90, h: 46, kind: 'case' },
      { x: 640, y: 520, w: 56, h: 56, kind: 'pillar' },
    ],
    guards: [
      {
        name: 'Warden Hale',
        x: 560, y: 120, speed: 62,
        waypoints: [[560, 120], [560, 530], [300, 530], [300, 120]],
      },
      {
        name: 'Warden Moss',
        x: 950, y: 500, speed: 58,
        waypoints: [[950, 500], [950, 150], [700, 150], [700, 500]],
      },
    ],
    cameras: [
      { x: 406, y: 250, baseAngle: 0, sweep: 70, speed: 34, range: 260 },
    ],
    coins: [
      { x: 225, y: 324 }, { x: 470, y: 580 }, { x: 700, y: 90 },
      { x: 1000, y: 580 }, { x: 1000, y: 90 },
    ],
  },
  {
    name: 'The Vault Hall',
    prize: 'Emerald Idol',
    parSeconds: 90,
    start: { x: 70, y: 590 },
    exit: { x: 56, y: 44, w: 64, h: 40 },
    loot: { x: 1060, y: 90, name: 'Emerald Idol' },
    walls: [
      // The great wall splits the hall; two doors, top and bottom.
      { x: 560, y: 28, w: 26, h: 200 },
      { x: 560, y: 420, w: 26, h: 200 },
      { x: 880, y: 28, w: 26, h: 150 },
      { x: 880, y: 420, w: 26, h: 200 },
    ],
    cover: [
      { x: 180, y: 130, w: 90, h: 46, kind: 'case' },
      { x: 180, y: 470, w: 90, h: 46, kind: 'case' },
      { x: 340, y: 300, w: 56, h: 56, kind: 'pillar' },
      { x: 700, y: 130, w: 90, h: 46, kind: 'case' },
      { x: 700, y: 470, w: 90, h: 46, kind: 'case' },
      { x: 980, y: 300, w: 56, h: 56, kind: 'statue' },
      { x: 980, y: 520, w: 90, h: 46, kind: 'case' },
    ],
    guards: [
      {
        name: 'Warden Hale',
        x: 300, y: 120, speed: 66,
        waypoints: [[300, 120], [300, 530], [480, 530], [480, 120]],
      },
      {
        name: 'Warden Moss',
        x: 720, y: 530, speed: 62,
        waypoints: [[720, 530], [720, 120], [1010, 120], [1010, 530]],
      },
      {
        name: 'Warden Pike',
        x: 640, y: 324, speed: 70,
        waypoints: [[640, 324], [820, 324], [820, 200], [640, 200]],
      },
    ],
    cameras: [
      { x: 586, y: 230, baseAngle: 90, sweep: 80, speed: 40, range: 270 },
      { x: 586, y: 418, baseAngle: -90, sweep: 80, speed: 36, range: 270 },
    ],
    coins: [
      { x: 225, y: 324 }, { x: 470, y: 90 }, { x: 470, y: 580 },
      { x: 700, y: 324 }, { x: 1010, y: 200 }, { x: 1010, y: 580 },
    ],
  },
  {
    name: 'The Sun Vault',
    prize: 'Crown of Tides',
    parSeconds: 110,
    start: { x: 576, y: 590 },
    exit: { x: 544, y: 44, w: 64, h: 40 },
    loot: { x: 576, y: 90, name: 'Crown of Tides' },
    walls: [
      { x: 300, y: 28, w: 26, h: 160 },
      { x: 300, y: 460, w: 26, h: 160 },
      { x: 826, y: 28, w: 26, h: 160 },
      { x: 826, y: 460, w: 26, h: 160 },
      { x: 430, y: 300, w: 90, h: 24 },
      { x: 632, y: 300, w: 90, h: 24 },
    ],
    cover: [
      { x: 150, y: 150, w: 56, h: 56, kind: 'pillar' },
      { x: 150, y: 440, w: 56, h: 56, kind: 'pillar' },
      { x: 946, y: 150, w: 56, h: 56, kind: 'pillar' },
      { x: 946, y: 440, w: 56, h: 56, kind: 'pillar' },
      { x: 400, y: 130, w: 90, h: 46, kind: 'case' },
      { x: 662, y: 130, w: 90, h: 46, kind: 'case' },
      { x: 400, y: 470, w: 90, h: 46, kind: 'case' },
      { x: 662, y: 470, w: 90, h: 46, kind: 'case' },
      { x: 548, y: 200, w: 56, h: 56, kind: 'statue' },
    ],
    guards: [
      {
        name: 'Warden Hale',
        x: 220, y: 120, speed: 72,
        waypoints: [[220, 120], [220, 530], [420, 530], [420, 120]],
      },
      {
        name: 'Warden Moss',
        x: 932, y: 120, speed: 72,
        waypoints: [[932, 120], [932, 530], [732, 530], [732, 120]],
      },
      {
        name: 'Warden Pike',
        x: 576, y: 380, speed: 76,
        waypoints: [[576, 380], [420, 380], [420, 200], [732, 200], [732, 380]],
      },
      {
        name: 'Warden Vale',
        x: 150, y: 324, speed: 68,
        waypoints: [[150, 324], [1002, 324]],
      },
    ],
    cameras: [
      { x: 326, y: 190, baseAngle: 0, sweep: 90, speed: 44, range: 280 },
      { x: 826, y: 190, baseAngle: 180, sweep: 90, speed: 44, range: 280 },
      { x: 576, y: 324, baseAngle: 90, sweep: 100, speed: 38, range: 300 },
    ],
    coins: [
      { x: 150, y: 324 }, { x: 1002, y: 324 }, { x: 576, y: 460 },
      { x: 320, y: 580 }, { x: 832, y: 580 }, { x: 576, y: 150 },
    ],
  },
];
