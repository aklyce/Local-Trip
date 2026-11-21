// Generative contour-map art: the app's visual signature (Discover hero, destination cards,
// trip headers). Each seed (a place name) always draws the same "terrain": a few peaks, each a
// stack of nested, slightly wobbly rings like the contour lines on a hiking map.
// Pure SVG in currentColor, decorative only (aria-hidden). With `animate`, the lines draw
// themselves in once on load (see .topo-draw in index.css; skipped under reduced motion).
import { memo } from 'react'
import { cx } from '@/utils/cx'

const W = 400
const H = 250

/** Small seeded random generator (mulberry32), so a name always gives the same picture. */
function seeded(seed: string): () => number {
  let h = 1779033703
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 3432918353)
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Ring {
  d: string
  /** 0 = innermost ring of its peak; used to stagger the draw-in. */
  order: number
}

function buildRings(seed: string, peaks: number, ringsPerPeak: number): Ring[] {
  const rand = seeded(seed)
  const rings: Ring[] = []
  for (let p = 0; p < peaks; p++) {
    const cx0 = W * (0.12 + rand() * 0.76)
    const cy0 = H * (0.1 + rand() * 0.8)
    const step = 13 + rand() * 9
    // One wobble per peak, shared by all its rings, so the lines nest and never cross.
    const waves = [2, 3, 5].map((freq) => ({ freq, amp: 0.05 + rand() * 0.09, phase: rand() * Math.PI * 2 }))
    const squash = 0.75 + rand() * 0.5
    for (let k = 1; k <= ringsPerPeak; k++) {
      const r = step * k
      let d = ''
      for (let i = 0; i <= 72; i++) {
        const t = (i / 72) * Math.PI * 2
        // The wobble fades a little on outer rings, like real terrain flattening out.
        const wobble = waves.reduce((sum, w) => sum + w.amp * Math.sin(t * w.freq + w.phase + k * 0.12), 0)
        const rr = r * (1 + wobble)
        const x = cx0 + Math.cos(t) * rr
        const y = cy0 + Math.sin(t) * rr * squash
        d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
      }
      rings.push({ d: `${d}Z`, order: k })
    }
  }
  return rings
}

interface Props {
  /** Usually the place name. Same seed, same terrain. */
  seed: string
  peaks?: number
  rings?: number
  /** Draw the lines in once on load. Use for one hero per page, not for lists. */
  animate?: boolean
  className?: string
}

function TopoArt({ seed, peaks = 3, rings = 9, animate = false, className }: Props) {
  const paths = buildRings(seed, peaks, rings)
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className={cx('pointer-events-none absolute inset-0 size-full', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      vectorEffect="non-scaling-stroke"
    >
      {paths.map((ring, i) => (
        <path
          key={i}
          d={ring.d}
          pathLength={1}
          vectorEffect="non-scaling-stroke"
          // Every fifth line is heavier, like the index contours on a real map.
          strokeWidth={ring.order % 5 === 0 ? 1.6 : 0.8}
          className={animate ? 'topo-draw' : undefined}
          style={animate ? { animationDelay: `${ring.order * 70}ms` } : undefined}
        />
      ))}
    </svg>
  )
}

export default memo(TopoArt)
