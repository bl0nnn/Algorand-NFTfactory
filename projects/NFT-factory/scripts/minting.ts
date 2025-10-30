import { AlgorandClient, algo, microAlgos } from '@algorandfoundation/algokit-utils'
import { TransactionSignerAccount } from '@algorandfoundation/algokit-utils/types/account'
import crypto from 'crypto'
import * as readline from 'readline'
import {
  FactoryContractClient,
  FactoryContractFactory,
} from '../smart_contracts/artifacts/factory_contract/FactoryContractClient'

function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()))
  })
}

async function NameToID(assetName: string, algorand: AlgorandClient) {
  const globalState = await algorand.app.getGlobalState(BigInt(1002))
  for (const key in globalState) {
    if (key == assetName) {
      const assetIdentifier = globalState[key].value
      return assetIdentifier
    }
  }
}

async function obtainNFT(
  appClient: FactoryContractClient,
  user: TransactionSignerAccount,
  algorand: AlgorandClient,
  rl: readline.Interface,
) {
  const assetName = await askQuestion(rl, `Inserisci il nome dell'NFT che vuoi possedere: `)

  const assetIdentifier = await NameToID(assetName, algorand)
  if (assetIdentifier === undefined) {
    throw new Error('Nessun asset ID restituito')
  }
  const optInResult = await algorand.send.assetOptIn({
    sender: user.addr,
    assetId: BigInt(assetIdentifier),
  })

  const claimNFT = await appClient.send.ownNft({
    sender: user.addr,
    args: {
      assetId: BigInt(assetIdentifier),
      name: assetName,
    },
    coverAppCallInnerTransactionFees: true,
    maxFee: microAlgos(2000),
  })
  console.log('Asset ottenuto!')
}

async function createNFT(appClient: FactoryContractClient, rl: readline.Interface) {
  //Promise<bigint>
  const name = await askQuestion(rl, 'Nome NFT: ')
  const url = await askQuestion(rl, 'URL (es: ipfs://...): ')
  const metadataStr = await askQuestion(rl, 'Metadata: ')

  const metadataHash = crypto.createHash('sha256').update(metadataStr).digest()
  const createdAsset = await appClient.send.mintNft({
    args: { name, url, metadata: metadataHash },
    coverAppCallInnerTransactionFees: true,
    maxFee: microAlgos(2000),
  })
  /*
  if (createdAsset.return === undefined) {
    throw new Error('Nessun asset ID restituito')
  }
  return createdAsset.return
  */
}

async function readGlobalState(algorand: AlgorandClient) {
  const globalState = await algorand.app.getGlobalState(BigInt(1002))
  console.log('Lista asset creati:\n')
  for (const key in globalState) {
    if (key !== 'creator' && key !== 'totalMinted') {
      const entry = globalState[key].value
      console.log(`\n[Nome asset: ${key}] -- [Id asset: ${entry}]`)
    }
  }
}

async function checkTotalMinted(appClient: FactoryContractClient, user: TransactionSignerAccount) {
  const totalMinted = await appClient.send.getTotalMinted({
    sender: user.addr,
    args: {},
  })
  return Number(totalMinted.return)
}

async function main() {
  const algorand = AlgorandClient.fromEnvironment()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER', algo(100))
  const user = await algorand.account.fromEnvironment('Miguel', algo(100))

  const factory = algorand.client.getTypedAppFactory(FactoryContractFactory, {
    defaultSender: deployer.addr,
  })

  const appClient = factory.getAppClientById({ appId: BigInt(1002) })

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  let exit = false

  while (!exit) {
    console.log('\nScegli cosa fare:')
    console.log('1. Verifica numero di NFT attualmente creati')
    console.log('2. Lista assets')
    console.log('3. Crea NFT')
    console.log('4. Reclama un NFT')
    console.log('5. Esci')

    const answer = await askQuestion(rl, 'Effettua una scelta => ')

    try {
      switch (answer) {
        case '1':
          console.log(`Totale asset mintati: ${await checkTotalMinted(appClient, user)}`)
          break
        case '2':
          await readGlobalState(algorand)
          break
        case '3':
          await createNFT(appClient, rl)
          break
        case '4':
          if ((await checkTotalMinted(appClient, user)) == 0) {
            console.log('Devi prima creare un NFT (opzione 3) prima di poterlo reclamare')
          } else {
            await obtainNFT(appClient, user, algorand, rl)
          }
          break
        case '5':
        case 'exit':
          exit = true
          console.log('Ciao')
          break
        default:
          console.log('Scelta non valida')
      }
    } catch (err) {
      console.error(err)
    }
  }

  rl.close()
}

main().catch((error) => {
  console.error(error)
})

//faccio pagare le fees all'app call cosi da evitare di drenare il saldo dell'app acccount e che in ogni caso la chiamata andrà a buon fine (outer app call fee = 1000microalgos, itxn fee = 1000 microalgos)
