import type { Card, Rank, Suit } from '../game/cards'

const directory = `${import.meta.env.BASE_URL}cards/tell/`
const pngRanks: Record<Rank, string> = {
  VII: 'seven', VIII: 'eight', IX: 'nine', X: 'ten', A: 'unter', F: 'ober', K: 'king', Á: 'ace',
}
const pngSuits: Record<Suit, string> = { piros: 'heart', tok: 'bell', zold: 'leaf', makk: 'acorn' }

export const tellFaceUrl = (card: Card) => `${directory}${pngSuits[card.suit]}-${pngRanks[card.rank]}.png`
export const tellBackUrl = `${import.meta.env.BASE_URL}cards/ultiro-back.svg`
