// Restrictions are just a deadline column on profiles - NULL or a past
// timestamp means "not restricted". Checking it this way (rather than a
// separate on/off boolean) is what makes the 10-day auto-lift work
// without needing a job to actively flip anything off: the moment the
// deadline passes, this just naturally returns false again everywhere
// it's checked.
export function isRestricted(until: string | null | undefined): boolean {
  if (!until) return false
  return new Date(until).getTime() > Date.now()
}

export function restrictionMessage(feature: 'posting' | 'commenting' | 'messaging' | 'posting stories'): string {
  return `You're temporarily restricted from ${feature}. This will lift automatically in a few days.`
}
