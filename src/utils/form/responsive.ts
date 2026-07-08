export type ResponsiveBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export type ResponsiveSpanConfig = Partial<Record<ResponsiveBreakpoint, number>>

export type ResponsiveSpanValue = number | ResponsiveSpanConfig

interface BreakpointConfig {
  threshold: number
  fallback: number
}

const BREAKPOINT_CONFIG: Record<ResponsiveBreakpoint, BreakpointConfig | null> = {
  xs: { threshold: 12, fallback: 24 },
  sm: { threshold: 12, fallback: 12 },
  md: { threshold: 8, fallback: 8 },
  lg: null,
  xl: null
}

const BREAKPOINT_ORDER: ResponsiveBreakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl']

export function resolveResponsiveSpanValue(
  span: ResponsiveSpanConfig | undefined,
  breakpoint: ResponsiveBreakpoint
): number | undefined {
  if (!span) return undefined

  const breakpointIndex = BREAKPOINT_ORDER.indexOf(breakpoint)

  for (let index = breakpointIndex; index >= 0; index -= 1) {
    const resolvedValue = span[BREAKPOINT_ORDER[index]]
    if (typeof resolvedValue === 'number') {
      return resolvedValue
    }
  }

  for (let index = breakpointIndex + 1; index < BREAKPOINT_ORDER.length; index += 1) {
    const resolvedValue = span[BREAKPOINT_ORDER[index]]
    if (typeof resolvedValue === 'number') {
      return resolvedValue
    }
  }

  return undefined
}

export function calculateResponsiveSpan(
  itemSpan: ResponsiveSpanValue | undefined,
  defaultSpan: ResponsiveSpanValue,
  breakpoint: ResponsiveBreakpoint
): number {
  if (itemSpan && typeof itemSpan === 'object') {
    const resolvedItemSpan = resolveResponsiveSpanValue(itemSpan, breakpoint)
    if (resolvedItemSpan !== undefined) {
      return resolvedItemSpan
    }
  }

  if (defaultSpan && typeof defaultSpan === 'object') {
    const resolvedDefaultSpan = resolveResponsiveSpanValue(defaultSpan, breakpoint)
    if (resolvedDefaultSpan !== undefined) {
      return resolvedDefaultSpan
    }
  }

  const finalSpan =
    typeof itemSpan === 'number' ? itemSpan : typeof defaultSpan === 'number' ? defaultSpan : 24

  const config = BREAKPOINT_CONFIG[breakpoint]
  if (!config) {
    return finalSpan
  }

  return finalSpan >= config.threshold ? finalSpan : config.fallback
}

export function createResponsiveSpanCalculator(defaultSpan: ResponsiveSpanValue) {
  return (itemSpan: ResponsiveSpanValue | undefined, breakpoint: ResponsiveBreakpoint): number => {
    return calculateResponsiveSpan(itemSpan, defaultSpan, breakpoint)
  }
}
