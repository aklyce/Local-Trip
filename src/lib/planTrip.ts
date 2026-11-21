// Lets any page open the one shared "Plan a trip" dialog (PRD v2 §4: keep all form behavior
// in one component). App owns the dialog and provides the opener through this context.
import { createContext, useContext } from 'react'
import type { Place } from '../types'

/**
 * Open the plan dialog, optionally with a destination preselected, or with a natural-language
 * request ("SF next week") that WebLLM turns into form values.
 */
export type OpenPlanTrip = (destination?: Place, prompt?: string) => void

export const PlanTripContext = createContext<OpenPlanTrip>(() => {})

export function usePlanTrip(): OpenPlanTrip {
  return useContext(PlanTripContext)
}
