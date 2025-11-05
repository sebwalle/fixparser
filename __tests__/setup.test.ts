import { describe, it, expect } from 'vitest'

describe('Setup', () => {
  it('should have Vitest configured correctly', () => {
    expect(true).toBe(true)
  })

  it('should handle basic arithmetic', () => {
    const sum = 1 + 1
    expect(sum).toBe(2)
  })
})
