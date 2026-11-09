export function periodOf(date) {
  const hour = date.getHours()
  if (hour < 5 || hour >= 22) return 'Night'
  if (hour < 12) return 'Morning'
  if (hour < 17) return 'Afternoon'
  return 'Evening'
}

export const strengthOf = episode => episode.worst_level ?? episode.start_level

export const shortDate = date => date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
export const longDate = date => date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
