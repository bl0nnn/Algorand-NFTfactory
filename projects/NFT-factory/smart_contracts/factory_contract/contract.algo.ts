import { Contract } from '@algorandfoundation/algorand-typescript'

export class FactoryContract extends Contract {
  public hello(name: string): string {
    return `Hello, ${name}`
  }
}
