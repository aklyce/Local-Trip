// One Discover card (PRD v2 VIS-4): photo, category badge, region, city, blurb,
// labeled straight-line distance and a single planning action. Clicking only opens
// the plan dialog; it never creates a trip by itself (FR-4).
import { ArrowRight, MapPin } from 'lucide-react'
import { useState } from 'react'
import { CATEGORY_LABELS } from '../data/destinations'
import type { DestinationResult } from '../lib/discover'
import { placeGradient, shortName } from '../lib/style'

export default function DestinationCard({ destination: d, onPlan }: { destination: DestinationResult; onPlan: () => void }) {
  const [imageFailed, setImageFailed] = useState(false)
  const city = shortName(d.place)

  return (
    <article className="group flex w-full flex-col overflow-hidden rounded-3xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-xl motion-reduce:transform-none motion-reduce:transition-none">
      <div className="relative aspect-[4/3] overflow-hidden" style={{ background: placeGradient(d.place.name) }}>
        {d.image && !imageFailed && (
          <img
            src={`${import.meta.env.BASE_URL}${d.image}`}
            alt={d.imageAlt}
            width={800}
            height={600}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="size-full object-cover transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        )}
        <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-ink backdrop-blur">
          {CATEGORY_LABELS[d.category]}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">{d.region}</p>
        <h3 className="mt-1 font-display text-3xl text-ink">{city}</h3>
        <p className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-soft">{d.blurb}</p>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
          <span className="flex items-center gap-1.5 text-sm text-ink-soft">
            <MapPin className="size-4 text-ink-muted" />
            <span>
              {Math.round(d.km).toLocaleString()} km away
              <span className="sr-only"> in a straight line from Berkeley</span>
            </span>
          </span>
          <button
            type="button"
            onClick={onPlan}
            aria-label={`Plan a trip to ${city}`}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-accent transition hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent"
          >
            Let’s go <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </article>
  )
}
