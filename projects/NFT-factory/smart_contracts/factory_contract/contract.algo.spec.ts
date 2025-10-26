import { TestExecutionContext } from '@algorandfoundation/algorand-typescript-testing'
import { describe, expect, it } from 'vitest'
import { FactoryContract } from './contract.algo'

describe('FactoryContract contract', () => {
  const ctx = new TestExecutionContext()
  it('Logs the returned value when sayHello is called', () => {
    const contract = ctx.contract.create(FactoryContract)

    const result = contract.hello('Sally')

    expect(result).toBe('Hello, Sally')
  })
})
