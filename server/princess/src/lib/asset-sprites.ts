const fairiesAtlas='/princess/assets/cards-fairies.webp';
const petsAtlas='/princess/assets/cards-pets.webp';
const princesAtlas='/princess/assets/cards-princes.webp';
const queensAtlas='/princess/assets/cards-queens.webp';
const princessAtlas='/princess/assets/princesses.webp';
const roundAtlas='/princess/assets/round-cards.webp';
const suitFamiliesAtlas='/princess/assets/suit-families.webp';
import { PRINCESSES, type Card, type Suit } from './setup';
import { spriteCell, type SpriteCell } from './sprite-crop';

export type AssetCell = { id: string; name: string };

export type AssetAtlas = {
  id: string;
  name: string;
  description: string;
  src: string;
  sheetWidth: number;
  sheetHeight: number;
  cols: number;
  rows: number;
  targetAspect: number;
  cells: AssetCell[];
};

const ranks = (suit: string): AssetCell[] => Array.from({ length: 12 }, (_, index) => ({
  id: `${suit}-${index + 1}`,
  name: `${suit[0].toUpperCase()}${suit.slice(1)} ${index + 1}`
}));

const suitAtlases: Record<Suit, AssetAtlas> = {
  fairies: { id: 'cards-fairies', name: 'Fairy cards', description: 'Ranks 1–12 · sparkle medallion', src: fairiesAtlas, sheetWidth: 1800, sheetHeight: 1000, cols: 6, rows: 2, targetAspect: 3 / 5, cells: ranks('fairies') },
  queens: { id: 'cards-queens', name: 'Queen cards', description: 'Ranks 1–12 · crown medallion', src: queensAtlas, sheetWidth: 1800, sheetHeight: 1000, cols: 6, rows: 2, targetAspect: 3 / 5, cells: ranks('queens') },
  princes: { id: 'cards-princes', name: 'Prince cards', description: 'Ranks 1–12 · sword medallion', src: princesAtlas, sheetWidth: 1800, sheetHeight: 1000, cols: 6, rows: 2, targetAspect: 3 / 5, cells: ranks('princes') },
  pets: { id: 'cards-pets', name: 'Pet cards', description: 'Ranks 1–12 · paw medallion', src: petsAtlas, sheetWidth: 1800, sheetHeight: 1000, cols: 6, rows: 2, targetAspect: 3 / 5, cells: ranks('pets') }
};

const roundIds = ['once-upon-a-time', 'invitation', 'masquerade-ball', 'royal-decree', 'musical-chairs', 'pets-revenge', 'late-to-the-ball', 'poisoned-apple', 'crystal-clear', 'upside-down', 'dancing-queens', 'prince-rings-twice', 'wedding-gift', 'after-party', 'bathroom-break', 'single-fairy', 'midnight-makeover', 'blind-mans-bluff', 'odds-and-evens', 'pass-the-bouquet', 'haggle-with-the-hag', 'magic-beans', 'three-times-a-lady', 'arranged-marriage', 'always-the-bridesmaid', 'sisterhood', 'late-for-a-very-important-date'] as const;
const roundNames = ['Once Upon a Time…', 'Invitation', 'Masquerade Ball', 'Royal Decree', 'Musical Chairs', 'Pets’ Revenge', 'Late to the Ball', 'Poisoned Apple', 'Crystal Clear', 'Upside Down', 'Dancing Queens', 'The Prince Always Rings Twice', 'Wedding Gift', 'After Party', 'Bathroom Break', 'Single Fairy', 'Midnight Makeover', 'Blind Man’s Bluff', 'Odds and Evens', 'Pass the Bouquet', 'Haggle with the Hag', 'Magic Beans', 'Three Times a Lady', 'Arranged Marriage', 'Always the Bridesmaid', 'Sisterhood', 'Late for a Very Important Date'] as const;

export const assetAtlases: AssetAtlas[] = [
  ...Object.values(suitAtlases),
  {
    id: 'princesses', name: 'Princesses', description: 'All twelve Princesses · thin white edge', src: princessAtlas,
    sheetWidth: 1800, sheetHeight: 1000, cols: 6, rows: 2, targetAspect: 3 / 5,
    cells: PRINCESSES.map(([id, name]) => ({ id, name }))
  },
  {
    id: 'rounds', name: 'Round cards', description: 'All twenty-seven Round rules · beige frame', src: roundAtlas,
    sheetWidth: 2700, sheetHeight: 900, cols: 9, rows: 3, targetAspect: 1,
    cells: roundIds.map((id, index) => ({
      id,
      name: roundNames[index]
    }))
  },
  {
    id: 'suit-families', name: 'Suit families', description: 'The four suit concepts · thin neutral edge', src: suitFamiliesAtlas,
    sheetWidth: 1200, sheetHeight: 500, cols: 4, rows: 1, targetAspect: 3 / 5,
    cells: ['fairies', 'queens', 'princes', 'pets'].map((id) => ({ id: `family-${id}`, name: `${id[0].toUpperCase()}${id.slice(1)} family` }))
  }
];

export function atlasCell(atlas: AssetAtlas, index: number): SpriteCell {
  return spriteCell(atlas.sheetWidth, atlas.sheetHeight, atlas.cols, atlas.rows, index % atlas.cols, Math.floor(index / atlas.cols));
}

export function atlasFrameAspect(atlas: AssetAtlas): number {
  return atlas.targetAspect;
}

export function atlasSpriteProps(atlas: AssetAtlas, index: number) {
  return {
    src: atlas.src,
    sheetWidth: atlas.sheetWidth,
    sheetHeight: atlas.sheetHeight,
    cols: atlas.cols,
    rows: atlas.rows,
    col: index % atlas.cols,
    row: Math.floor(index / atlas.cols),
    targetAspect: atlasFrameAspect(atlas)
  };
}

export function cardSpriteProps(card: Card) {
  return atlasSpriteProps(suitAtlases[card.suit], card.rank - 1);
}

export function princessSpriteProps(id?: string) {
  const index = PRINCESSES.findIndex(([key]) => key === id);
  const atlas = assetAtlases.find(({ id: atlasId }) => atlasId === 'princesses')!;
  return atlasSpriteProps(atlas, Math.max(0, index));
}

export function roundSpriteProps(id: string) {
  const index = roundIds.indexOf(id as typeof roundIds[number]);
  const atlas = assetAtlases.find(({ id: atlasId }) => atlasId === 'rounds')!;
  return atlasSpriteProps(atlas, Math.max(0, index));
}

export function roundTargetAspect(_id: string): number {
  return 1;
}
