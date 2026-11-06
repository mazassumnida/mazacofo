export const RANKS = [
  'newbie',
  'pupil',
  'specialist',
  'expert',
  'candidate master',
  'master',
  'international master',
  'grandmaster',
  'international grandmaster',
  'legendary grandmaster',
] as const;

export type Rank = (typeof RANKS)[number];

export interface RankInfo {
  displayName: string;
  min: number;
  max: number;
  color: string;
  miniColors: readonly [string, string, string];
}

const MINI_COLORS = {
  gray: ['#968A87', '#808080', '#96878F'],
  green: ['#089630', '#008000', '#399608'],
  mint: ['#069ABF', '#03A89E', '#06BF7E'],
  blue: ['#480CE8', '#0000FF', '#0C46E8'],
  purple: ['#C20A66', '#AA00AA', '#900AC2'],
  orange: ['#E89D0C', '#FF8C00', '#E8650C'],
  red: ['#E82C0C', '#FF0000', '#E80C7A'],
} as const satisfies Record<string, readonly [string, string, string]>;

export const RANK_INFO: Record<Rank, RankInfo> = {
  newbie: {
    displayName: 'Newbie',
    min: 0,
    max: 1199,
    color: '#CBCBCB',
    miniColors: MINI_COLORS.gray,
  },
  pupil: {
    displayName: 'Pupil',
    min: 1200,
    max: 1399,
    color: '#32D336',
    miniColors: MINI_COLORS.green,
  },
  specialist: {
    displayName: 'Specialist',
    min: 1400,
    max: 1599,
    color: '#00D9CC',
    miniColors: MINI_COLORS.mint,
  },
  expert: {
    displayName: 'Expert',
    min: 1600,
    max: 1899,
    color: '#656AFF',
    miniColors: MINI_COLORS.blue,
  },
  'candidate master': {
    displayName: 'Candidate Master',
    min: 1900,
    max: 2099,
    color: '#EE00EE',
    miniColors: MINI_COLORS.purple,
  },
  master: {
    displayName: 'Master',
    min: 2100,
    max: 2299,
    color: '#FF8C00',
    miniColors: MINI_COLORS.orange,
  },
  'international master': {
    displayName: 'International Master',
    min: 2300,
    max: 2399,
    color: '#FF8C00',
    miniColors: MINI_COLORS.orange,
  },
  grandmaster: {
    displayName: 'Grandmaster',
    min: 2400,
    max: 2599,
    color: '#FC1212',
    miniColors: MINI_COLORS.red,
  },
  'international grandmaster': {
    displayName: 'International Grandmaster',
    min: 2600,
    max: 2999,
    color: '#FC1212',
    miniColors: MINI_COLORS.red,
  },
  'legendary grandmaster': {
    displayName: 'Legendary Grandmaster',
    min: 3000,
    max: 5000,
    color: '#FC1212',
    miniColors: MINI_COLORS.red,
  },
};

export const isRank = (value: string): value is Rank =>
  (RANKS as readonly string[]).includes(value);
