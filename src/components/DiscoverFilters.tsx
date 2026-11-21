// Discover filter bar (PRD v2 VIS-5): search, category, distance and Surprise me in one row,
// BoardUI SearchField, Select and Button, plus category pills (React Aria ToggleButtonGroup)
// coloured like the destination cards.
import { Check, Shuffle } from 'lucide-react'
import { ToggleButton, ToggleButtonGroup } from 'react-aria-components'
import { Button } from '@/components/base/buttons/button'
import { SearchField } from '@/components/base/search-field/search-field'
import { Select, SelectItem } from '@/components/base/select/select'
import { cx } from '@/utils/cx'
import { CATEGORY_LABELS, type DestinationCategory } from '../data/destinations'
import { DISTANCE_OPTIONS, type DiscoverFilters as Filters } from '../lib/discover'
import { FIELD } from '../lib/style'

interface Props {
  filters: Filters
  onChange: (next: Filters) => void
  onSurprise: () => void
  surpriseDisabled: boolean
}

const CATEGORIES = ['city', 'water', 'outdoors'] as const satisfies readonly DestinationCategory[]

// Dot shown on an unselected pill: the card colour of that category.
const DOT: Record<DestinationCategory, string> = { city: 'bg-orange-500', water: 'bg-cyan-500', outdoors: 'bg-emerald-500' }

export default function DiscoverFilters({ filters, onChange, onSurprise, surpriseDisabled }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })

  return (
    <div role="search" aria-label="Filter destinations" className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <SearchField
        aria-label="Search destinations"
        placeholder="Search by city, scenery, or vibe"
        value={filters.query}
        onChange={(query) => set({ query })}
        className="min-w-0 flex-1"
      />
      <div className="flex flex-wrap items-center gap-3">
        {/* Category pills in the same colours as the cards. One is always selected; the chosen
            one is filled and gets a check mark, so it doesn't rely on colour alone. */}
        <ToggleButtonGroup
          aria-label="Category"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[filters.category ?? 'all']}
          onSelectionChange={(keys) => {
            const key = [...keys][0]
            set({ category: key === undefined || key === 'all' ? null : (key as DestinationCategory) })
          }}
          className="flex flex-wrap gap-2"
        >
          {(['all', ...CATEGORIES] as const).map((c) => (
            <ToggleButton
              key={c}
              id={c}
              className={({ isSelected, isFocusVisible, isHovered }) =>
                cx(
                  'flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-body-medium outline-none transition-colors',
                  isSelected
                    ? cx('border-transparent text-body-semibold', c === 'all' ? 'bg-neutral-950 text-white' : FIELD[c])
                    : cx('border-border-button-default bg-background-primary-default text-text-primary', isHovered && 'border-border-button-hover'),
                  isFocusVisible && 'ring-2 ring-border-focus-ring ring-offset-2',
                )
              }
            >
              {({ isSelected }) => (
                <>
                  {isSelected ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    c !== 'all' && <span className={cx('size-2.5 rounded-full', DOT[c])} aria-hidden />
                  )}
                  {c === 'all' ? 'All' : CATEGORY_LABELS[c]}
                </>
              )}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Select
          aria-label="Distance from Berkeley"
          selectedKey={filters.maxMi === null ? 'any' : String(filters.maxMi)}
          onSelectionChange={(key) => set({ maxMi: key === null || key === 'any' ? null : Number(key) })}
        >
          <SelectItem id="any">Any distance</SelectItem>
          {DISTANCE_OPTIONS.map((miles) => (
            <SelectItem key={miles} id={String(miles)}>
              Under {miles} mi
            </SelectItem>
          ))}
        </Select>
        <Button variant="secondary" leadingIcon={Shuffle} onClick={onSurprise} disabled={surpriseDisabled}>
          Surprise me
        </Button>
      </div>
    </div>
  )
}
