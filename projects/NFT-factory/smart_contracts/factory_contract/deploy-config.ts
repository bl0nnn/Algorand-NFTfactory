import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { FactoryContractFactory } from '../artifacts/factory_contract/FactoryContractClient'

// Below is a showcase of various deployment options you can use in TypeScript Client
export async function deploy() {
  console.log('=== Deploying FactoryContract ===')

  const algorand = AlgorandClient.fromEnvironment()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  const factory = algorand.client.getTypedAppFactory(FactoryContractFactory, {
    defaultSender: deployer.addr,
  })

  const { appClient, result } = await factory.deploy({
    appName: factory.appName,
    createParams: {
      method: 'onCreate',
      args: [],
    },
    onUpdate: 'append',
    onSchemaBreak: 'append',
    suppressLog: true,
  })

  // If app was just created fund the app account
  if (['create', 'replace'].includes(result.operationPerformed)) {
    await algorand.send.payment({
      amount: (1).algo(),
      sender: deployer.addr,
      receiver: appClient.appAddress,
    })
  }

  const { appId, appAddress, appName } = appClient

  console.table({
    ['name']: appName,
    ['id']: appId.toString(),
    ['address']: appAddress.toString(),
    ['deployer']: deployer.addr.toString(),
  })
}
