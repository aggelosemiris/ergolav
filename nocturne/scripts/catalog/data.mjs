// Nocturne's demo catalogue. Every artist, album and title is fictional and written for this
// project. Musical parameters drive the synthesiser in compose.mjs.

export const GENRES = [
  { id: 'lofi', name: 'Lo-fi Study', color: '#7a5af5' },
  { id: 'ambient', name: 'Ambient', color: '#2f8f9d' },
  { id: 'synthwave', name: 'Synthwave', color: '#d1497a' },
  { id: 'house', name: 'Deep House', color: '#2e6fd8' },
  { id: 'piano', name: 'Piano & Keys', color: '#8a6d4b' },
  { id: 'chiptune', name: '8-bit', color: '#3fa34d' },
  { id: 'downtempo', name: 'Downtempo', color: '#b5652b' },
  { id: 'jazz', name: 'Late-night Jazz', color: '#a03f3f' },
];

// root is a MIDI note number for the tonic (48 = C3)
export const ARTISTS = [
  {
    slug: 'mira-solenne', name: 'Mira Solenne', genre: 'piano', listeners: 1284330,
    bio: 'Mira Solenne writes small, patient piano pieces at night in a converted boathouse. Her records are built from first takes and left a little unpolished on purpose.',
    albums: [
      {
        slug: 'paper-lanterns', title: 'Paper Lanterns', type: 'album', date: '2024-03-15',
        tracks: [
          { title: 'Paper Lanterns', bpm: 72, root: 50, mode: 'major', prog: [0, 4, 5, 3], sec: 78 },
          { title: 'The Long Hallway', bpm: 66, root: 45, mode: 'minor', prog: [0, 5, 2, 6], sec: 84 },
          { title: 'Letters Never Sent', bpm: 76, root: 48, mode: 'major', prog: [5, 3, 0, 4], sec: 70 },
          { title: 'Low Tide Waltz', bpm: 80, root: 53, mode: 'major', prog: [0, 3, 1, 4], sec: 72 },
        ],
      },
      {
        slug: 'first-frost', title: 'First Frost', type: 'single', date: '2025-11-02',
        tracks: [{ title: 'First Frost', bpm: 70, root: 52, mode: 'minor', prog: [0, 3, 6, 4], sec: 80 }],
      },
    ],
  },
  {
    slug: 'the-low-tides', name: 'The Low Tides', genre: 'lofi', listeners: 3412908,
    bio: 'A bedroom duo trading loops across two time zones. Dusty keys, soft drums, and the hiss of a cassette deck they refuse to replace.',
    albums: [
      {
        slug: 'rainy-window-tapes', title: 'Rainy Window Tapes', type: 'album', date: '2023-10-20',
        tracks: [
          { title: 'Condensation', bpm: 78, root: 50, mode: 'dorian', prog: [0, 3, 6, 2], sec: 74, swing: 0.14 },
          { title: 'Umbrella Shop', bpm: 84, root: 53, mode: 'major', prog: [1, 4, 0, 5], sec: 70, swing: 0.12 },
          { title: 'Half Past Two', bpm: 74, root: 48, mode: 'minor', prog: [0, 5, 3, 4], sec: 76, swing: 0.16 },
          { title: 'Tea Gone Cold', bpm: 80, root: 55, mode: 'dorian', prog: [0, 3, 0, 4], sec: 68, swing: 0.13 },
          { title: 'Streetlights on Glass', bpm: 76, root: 52, mode: 'minor', prog: [5, 3, 0, 6], sec: 72, swing: 0.15 },
        ],
      },
      {
        slug: 'sunday-static', title: 'Sunday Static', type: 'ep', date: '2025-06-08',
        tracks: [
          { title: 'Laundromat Radio', bpm: 82, root: 51, mode: 'major', prog: [0, 5, 1, 4], sec: 66, swing: 0.12 },
          { title: 'Slow Morning', bpm: 72, root: 46, mode: 'dorian', prog: [0, 6, 3, 4], sec: 74, swing: 0.15 },
          { title: 'Crossword Pencil', bpm: 86, root: 54, mode: 'minor', prog: [0, 3, 5, 4], sec: 64, swing: 0.11 },
        ],
      },
    ],
  },
  {
    slug: 'kestrel-and-vane', name: 'Kestrel & Vane', genre: 'synthwave', listeners: 2250117,
    bio: 'Two former arcade technicians making night-drive music with machines older than they are. Big drums, bigger chords, no apologies.',
    albums: [
      {
        slug: 'neon-cartography', title: 'Neon Cartography', type: 'album', date: '2022-08-12',
        tracks: [
          { title: 'Grid Runner', bpm: 104, root: 45, mode: 'minor', prog: [0, 5, 2, 6], sec: 86 },
          { title: 'Chrome Horizon', bpm: 100, root: 50, mode: 'minor', prog: [0, 3, 5, 4], sec: 84 },
          { title: 'Motel Pool at 3AM', bpm: 96, root: 47, mode: 'minor', prog: [5, 6, 0, 0], sec: 80 },
          { title: 'Signal Fade', bpm: 108, root: 52, mode: 'minor', prog: [0, 6, 5, 6], sec: 82 },
        ],
      },
      {
        slug: 'afterglow-drive', title: 'Afterglow Drive', type: 'album', date: '2025-02-28',
        tracks: [
          { title: 'Afterglow Drive', bpm: 102, root: 49, mode: 'minor', prog: [0, 5, 3, 4], sec: 88 },
          { title: 'Overpass Lights', bpm: 98, root: 44, mode: 'minor', prog: [0, 2, 5, 6], sec: 80 },
          { title: 'Last Exit Sunrise', bpm: 106, root: 51, mode: 'major', prog: [0, 4, 5, 3], sec: 84 },
        ],
      },
    ],
  },
  {
    slug: 'juno-abara', name: 'Juno Abara', genre: 'house', listeners: 1876045,
    bio: 'DJ and producer known for long, warm sets that start slow and never quite peak. Grew up on her parents\' soul records and the hum of the night bus.',
    albums: [
      {
        slug: 'tidal-hours', title: 'Tidal Hours', type: 'album', date: '2024-07-19',
        tracks: [
          { title: 'Tidal Hours', bpm: 122, root: 45, mode: 'dorian', prog: [0, 3, 0, 4], sec: 92 },
          { title: 'Saltwater Soul', bpm: 120, root: 50, mode: 'minor', prog: [0, 5, 3, 4], sec: 88 },
          { title: 'Night Bus Home', bpm: 124, root: 47, mode: 'dorian', prog: [0, 6, 3, 4], sec: 90 },
          { title: 'Lighthouse Keeper', bpm: 121, root: 52, mode: 'minor', prog: [5, 3, 0, 6], sec: 86 },
        ],
      },
    ],
  },
  {
    slug: 'halden-field', name: 'Halden Field', genre: 'ambient', listeners: 734512,
    bio: 'Field recordist turned composer. Halden Field records long, slow pieces meant to be played quietly while the weather changes outside.',
    albums: [
      {
        slug: 'slow-weather', title: 'Slow Weather', type: 'album', date: '2021-12-03',
        tracks: [
          { title: 'Barometer', bpm: 64, root: 50, mode: 'major', prog: [0, 3, 5, 4], sec: 90 },
          { title: 'Fog Lifting', bpm: 60, root: 45, mode: 'dorian', prog: [0, 6, 3, 0], sec: 96 },
          { title: 'Snowmelt', bpm: 66, root: 52, mode: 'major', prog: [3, 0, 4, 5], sec: 88 },
        ],
      },
      {
        slug: 'glasshouse', title: 'Glasshouse', type: 'ep', date: '2025-04-11',
        tracks: [
          { title: 'Glasshouse', bpm: 62, root: 48, mode: 'major', prog: [0, 4, 3, 0], sec: 92 },
          { title: 'Moss and Light', bpm: 58, root: 43, mode: 'mixolydian', prog: [0, 6, 3, 0], sec: 94 },
        ],
      },
    ],
  },
  {
    slug: 'bitwise-orchard', name: 'Bitwise Orchard', genre: 'chiptune', listeners: 529880,
    bio: 'One person, one battered handheld console, and an orchard of tiny square waves. Bright melodies for imaginary adventure games.',
    albums: [
      {
        slug: 'pixel-harvest', title: 'Pixel Harvest', type: 'album', date: '2023-05-05',
        tracks: [
          { title: 'Pixel Harvest', bpm: 140, root: 60, mode: 'major', prog: [0, 4, 5, 3], sec: 66 },
          { title: 'Moonlit Dungeon', bpm: 132, root: 57, mode: 'minor', prog: [0, 5, 6, 4], sec: 68 },
          { title: 'Save Point', bpm: 120, root: 62, mode: 'major', prog: [3, 4, 0, 5], sec: 60 },
          { title: 'Boss Rush Picnic', bpm: 150, root: 59, mode: 'mixolydian', prog: [0, 6, 3, 0], sec: 62 },
        ],
      },
    ],
  },
  {
    slug: 'oda-merle', name: 'Oda Merle', genre: 'downtempo', listeners: 961204,
    bio: 'Producer and cellist whose records sit somewhere between a train window and a late dinner. Deep bass, slow drums, plucked strings.',
    albums: [
      {
        slug: 'velvet-transit', title: 'Velvet Transit', type: 'album', date: '2024-10-04',
        tracks: [
          { title: 'Velvet Transit', bpm: 94, root: 47, mode: 'minor', prog: [0, 5, 3, 6], sec: 84 },
          { title: 'Sleeper Car', bpm: 90, root: 45, mode: 'dorian', prog: [0, 3, 6, 4], sec: 86 },
          { title: 'Amber Platform', bpm: 96, root: 50, mode: 'minor', prog: [5, 6, 0, 4], sec: 80 },
          { title: 'Departures Board', bpm: 92, root: 52, mode: 'minor', prog: [0, 2, 3, 4], sec: 82 },
        ],
      },
    ],
  },
  {
    slug: 'the-lamplight-quartet', name: 'The Lamplight Quartet', genre: 'jazz', listeners: 418223,
    bio: 'A house band that outlived its house. Brushes, upright bass, and a slightly out-of-tune electric piano, recorded after closing time.',
    albums: [
      {
        slug: 'after-hours', title: 'After Hours at the Lamplight', type: 'album', date: '2022-01-21',
        tracks: [
          { title: 'Closing Time Shuffle', bpm: 112, root: 53, mode: 'major', prog: [1, 4, 0, 0], sec: 78, swing: 0.33 },
          { title: 'Blue Booth', bpm: 104, root: 50, mode: 'major', prog: [1, 4, 0, 5], sec: 82, swing: 0.33 },
          { title: 'Rain on the Awning', bpm: 96, root: 48, mode: 'major', prog: [0, 5, 1, 4], sec: 80, swing: 0.3 },
          { title: 'Last Call Waltz', bpm: 120, root: 55, mode: 'major', prog: [1, 4, 0, 3], sec: 74, swing: 0.33 },
        ],
      },
    ],
  },
];

// Editorial playlists, owned by the Nocturne Editors profile. Tracks referenced by title.
export const EDITORIAL = [
  {
    slug: 'nightfall-focus', name: 'Nightfall Focus', description: 'Soft beats and patient keys for deep work after dark.',
    tracks: ['Condensation', 'Paper Lanterns', 'Tea Gone Cold', 'Barometer', 'Slow Morning', 'The Long Hallway', 'Half Past Two', 'Glasshouse'],
  },
  {
    slug: 'midnight-motorway', name: 'Midnight Motorway', description: 'Neon-lit synths and steady drums for the long way home.',
    tracks: ['Grid Runner', 'Afterglow Drive', 'Night Bus Home', 'Chrome Horizon', 'Velvet Transit', 'Signal Fade', 'Last Exit Sunrise'],
  },
  {
    slug: 'kitchen-disco', name: 'Kitchen Floor Disco', description: 'Warm house grooves for cooking, cleaning or dancing in socks.',
    tracks: ['Tidal Hours', 'Saltwater Soul', 'Lighthouse Keeper', 'Pixel Harvest', 'Umbrella Shop', 'Boss Rush Picnic'],
  },
  {
    slug: 'quiet-hours', name: 'Quiet Hours', description: 'Ambient textures and gentle piano to slow everything down.',
    tracks: ['Fog Lifting', 'Moss and Light', 'First Frost', 'Snowmelt', 'Letters Never Sent', 'Low Tide Waltz'],
  },
  {
    slug: 'after-dark-jazz', name: 'After Dark Jazz Club', description: 'Brushed drums, walking bass and a piano that has seen things.',
    tracks: ['Closing Time Shuffle', 'Blue Booth', 'Rain on the Awning', 'Last Call Waltz', 'Sleeper Car', 'Amber Platform'],
  },
  {
    slug: 'fresh-finds', name: 'Fresh Finds', description: 'The newest releases on Nocturne, updated as they land.',
    tracks: ['First Frost', 'Laundromat Radio', 'Afterglow Drive', 'Glasshouse', 'Crossword Pencil', 'Overpass Lights', 'Moss and Light'],
  },
];
