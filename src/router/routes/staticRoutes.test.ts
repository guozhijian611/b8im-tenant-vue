import { describe, expect, it } from 'vitest'
import { staticRoutes } from './staticRoutes'

describe('staticRoutes', () => {
  it('does not expose unsupported self-service auth routes', () => {
    const paths = staticRoutes.map((route) => route.path)
    const names = staticRoutes.map((route) => route.name)

    expect(paths).not.toContain('/auth/register')
    expect(paths).not.toContain('/auth/forget-password')
    expect(names).not.toContain('Register')
    expect(names).not.toContain('ForgetPassword')
  })
})
