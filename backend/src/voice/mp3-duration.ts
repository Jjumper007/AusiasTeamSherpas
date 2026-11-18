/// <reference types="node" />
/**
 * Length of an MP3 in seconds, measured by walking its frames (MPEG audio Layer III), so the scene
 * lasts as long as the file the video plays, trailing silence included. No ffprobe needed.
 */

const ID3_HEADER_BYTES = 10
const ID3_SIZE_OFFSET = 6
const SYNCSAFE_BITS = 7
const FRAME_HEADER_BYTES = 4
const SYNC_BYTE = 0xff
const SYNC_MASK = 0xe0
const LAYER_III = 1
const BITS_PER_BYTE = 8
const KBPS = 1000

const MPEG1 = 3
const MPEG2 = 2
const MPEG25 = 0

/** Layer III bitrates in kbit/s by bitrate index (0 = free format, 15 = invalid). */
const BITRATES: Readonly<Record<'v1' | 'v2', readonly number[]>> = {
  v1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  v2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
}
const SAMPLE_RATES: Readonly<Record<number, readonly number[]>> = {
  [MPEG1]: [44100, 48000, 32000],
  [MPEG2]: [22050, 24000, 16000],
  [MPEG25]: [11025, 12000, 8000],
}
const SAMPLES_PER_FRAME: Readonly<Record<number, number>> = { [MPEG1]: 1152, [MPEG2]: 576, [MPEG25]: 576 }

/** The Xing/Info tag sits after the side information, at most this far into the first frame. */
const VBR_TAG_SEARCH_BYTES = 40
const VBR_TAGS = ['Xing', 'Info']

interface Frame {
  readonly bytes: number
  readonly seconds: number
}

/** Bytes taken by an ID3v2 tag at the start of the file (0 without one). */
const id3Size = (data: Uint8Array): number => {
  const isId3 = data[0] === 0x49 && data[1] === 0x44 && data[2] === 0x33
  if (!isId3 || data.length < ID3_HEADER_BYTES) return 0
  const size = [0, 1, 2, 3].reduce(
    (total, index) => (total << SYNCSAFE_BITS) | (data[ID3_SIZE_OFFSET + index] & 0x7f),
    0,
  )
  return ID3_HEADER_BYTES + size
}

/** The Layer III frame whose header starts at `offset`, or undefined when there is none. */
const frameAt = (data: Uint8Array, offset: number): Frame | undefined => {
  if (offset + FRAME_HEADER_BYTES > data.length) return undefined
  const [b0, b1, b2] = [data[offset], data[offset + 1], data[offset + 2]]
  if (b0 !== SYNC_BYTE || (b1 & SYNC_MASK) !== SYNC_MASK) return undefined
  const version = (b1 >> 3) & 3
  const layer = (b1 >> 1) & 3
  const bitrate = BITRATES[version === MPEG1 ? 'v1' : 'v2'][b2 >> 4]
  const sampleRate = SAMPLE_RATES[version]?.[(b2 >> 2) & 3]
  if (layer !== LAYER_III || !bitrate || !sampleRate) return undefined
  const samples = SAMPLES_PER_FRAME[version]
  const padding = (b2 >> 1) & 1
  const bytes = Math.floor((samples / BITS_PER_BYTE) * ((bitrate * KBPS) / sampleRate)) + padding
  return { bytes, seconds: samples / sampleRate }
}

/** Whether the frame at `offset` is a Xing/Info header (encoder metadata, no audio), as LAME writes first. */
const isVbrHeader = (data: Uint8Array, offset: number): boolean => {
  const start = offset + FRAME_HEADER_BYTES
  const text = Buffer.from(data.subarray(start, start + VBR_TAG_SEARCH_BYTES)).toString('latin1')
  return VBR_TAGS.some((tag) => text.includes(tag))
}

/** Seconds of audio in an MP3 buffer. Bytes that are not a frame (tags, garbage) are skipped. */
export const mp3DurationSec = (data: Uint8Array): number => {
  let offset = id3Size(data)
  let seconds = 0
  let isFirstFrame = true
  while (offset + FRAME_HEADER_BYTES <= data.length) {
    const frame = frameAt(data, offset)
    if (!frame) {
      offset += 1
      continue
    }
    if (!(isFirstFrame && isVbrHeader(data, offset))) seconds += frame.seconds
    isFirstFrame = false
    offset += frame.bytes
  }
  return seconds
}
