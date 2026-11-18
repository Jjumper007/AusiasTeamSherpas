import type { TimedWord } from './captions'

/** One MPEG-1 Layer III frame header: 128 kbit/s, 44.1 kHz, no padding (417 bytes, 1152 samples). */
const FRAME_HEADER = [0xff, 0xfb, 0x90, 0x00]
export const FRAME_BYTES = 417
export const FRAME_SEC = 1152 / 44100

/** A silent-looking MP3 of `frames` frames, optionally behind an ID3v2 tag. */
export const fakeMp3 = (frames: number, id3Bytes = 0): Uint8Array<ArrayBuffer> => {
  const tag = id3Bytes > 0 ? [0x49, 0x44, 0x33, 4, 0, 0, 0, 0, (id3Bytes >> 7) & 0x7f, id3Bytes & 0x7f] : []
  const frame = [...FRAME_HEADER, ...new Array<number>(FRAME_BYTES - FRAME_HEADER.length).fill(0)]
  return Uint8Array.from([...tag, ...new Array<number>(id3Bytes).fill(0), ...Array.from({ length: frames }, () => frame).flat()])
}

/** Words of `text` as Scribe would time them: one after the other, `wordSec` each, from `startSec`. */
export const fakeSpokenWords = (text: string, wordSec = 0.3, startSec = 0.1): TimedWord[] =>
  text
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word, index) => ({ text: word, startSec: startSec + index * wordSec, endSec: startSec + (index + 1) * wordSec - 0.02 }))
