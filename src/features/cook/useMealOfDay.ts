import { useEffect, useState } from 'react'
import type { MealType } from '../meals/dayModel'
import { mealForTime } from './cookDraft'

/**
 * The meal for the time of day. Checked again when the app returns to the foreground, so a
 * draft started at noon and opened in the evening suggests dinner.
 */
export function useMealOfDay(): MealType {
  const [meal, setMeal] = useState(() => mealForTime(new Date()))

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') setMeal(mealForTime(new Date()))
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  return meal
}
