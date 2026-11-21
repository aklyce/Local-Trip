// One Discover card (PRD v2 VIS-4): contour art or photo, category chip, region, city, blurb,
// labeled straight-line distance and a single planning action. Clicking only opens
// the plan dialog; it never creates a trip by itself (FR-4).
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Chip } from '@/components/base/badges/chip'
import { Button } from '@/components/base/buttons/button'
import { CATEGORY_LABELS } from '../data/destinations'
import type { DestinationResult } from '../lib/discover'
import { cx } from '@/utils/cx'
import { FIELD, shortName } from '../lib/style'
import { KM_PER_MILE } from '../lib/transport'
import TopoArt from './TopoArt'

export default function DestinationCard({ destination: d, onPlan }: { destination: DestinationResult; onPlan: () => void }) {
  const [imageFailed, setImageFailed] = useState(false)
  const city = shortName(d.place)

  return (
    <article className="flex w-full flex-col overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default">
      <div className={cx('relative aspect-[16/10] overflow-hidden', FIELD[d.category])}>
        {/* Contour art seeded by the place; a photo covers it when one exists. */}
        <TopoArt seed={d.place.name} className="opacity-45" />
        <span className="absolute right-4 top-3 text-right font-display text-[2.75rem] font-extrabold leading-none tracking-tight tabular-nums">
          {Math.round(d.km / KM_PER_MILE).toLocaleString()}
          <span className="ml-1 text-body-semibold tracking-normal">mi</span>
          <span className="sr-only"> away in a straight line from Berkeley</span>
        </span>
        {d.image && !imageFailed && (
          <img
            src={`${import.meta.env.BASE_URL}${d.image}`}
            alt={d.imageAlt}
            width={800}
            height={500}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="relative size-full object-cover"
          />
        )}
        <Chip color="gray" className="absolute bottom-3 left-3">
          {CATEGORY_LABELS[d.category]}
        </Chip>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-body-regular text-text-secondary">{d.region}</p>
        <h3 className="mt-0.5 text-place text-text-primary">{city}</h3>
        <p className="mt-2 flex-1 text-body-regular text-text-secondary">{d.blurb}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-body-regular text-text-tertiary">from Berkeley</span>
          <Button variant="secondary" size="small" trailingIcon={ArrowRight} onClick={onPlan} aria-label={`Plan a trip to ${city}`}>
            Plan trip
          </Button>
        </div>
      </div>
    </article>
  )
}
