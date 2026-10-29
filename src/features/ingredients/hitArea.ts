/**
 * Stretches a 32 px control's tappable area to 44 px (iOS minimum) without making it look bigger:
 * an invisible layer reaches 6 px above and below it. The parent needs no extra room.
 */
export const HIT_AREA_44 = 'relative before:absolute before:-inset-x-1 before:-inset-y-1.5'
