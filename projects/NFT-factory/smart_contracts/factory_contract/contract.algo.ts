import {
  abimethod,
  Account,
  assert,
  bytes,
  contract,
  Contract,
  Global,
  GlobalState,
  itxn,
  Txn,
  Uint64,
  uint64,
} from '@algorandfoundation/algorand-typescript'

@contract({ stateTotals: { globalUints: 32, globalBytes: 32 } })
export class FactoryContract extends Contract {
  public creator = GlobalState<Account>({ key: 'creator' })
  //public lastAssetId = GlobalState<uint64>({ key: 'last_asset_id' })
  public totalMinted = GlobalState<uint64>()

  @abimethod({ onCreate: 'require' })
  public onCreate() {
    this.creator.value = Txn.sender
    this.totalMinted.value = Uint64(0)
  }
  @abimethod()
  public mint_NFT(name: string, url: string, metadata: bytes) {
    assert(Txn.sender === this.creator.value, 'Non autorizzato')

    const itxn_result = itxn
      .assetConfig({
        total: 1,
        decimals: 0,
        unitName: 'NFT',
        assetName: name,
        url: url,
        metadataHash: metadata,
        manager: Global.currentApplicationAddress,
        reserve: Global.currentApplicationAddress,
        freeze: Global.currentApplicationAddress,
        clawback: Global.currentApplicationAddress,
        fee: 0,
      })
      .submit()

    const total = this.totalMinted.value
    this.totalMinted.value = total + Uint64(1)
    GlobalState<uint64>({ key: name }).value = itxn_result.createdAsset.id
    return itxn_result.createdAsset.id
  }

  public own_NFT(assetId: uint64, name: string) {
    itxn
      .assetTransfer({
        xferAsset: assetId,
        assetReceiver: Txn.sender,
        assetAmount: 1,
        fee: 0,
      })
      .submit()

    GlobalState<uint64>({ key: name }).delete()
  }

  @abimethod()
  public get_totalMinted(): uint64 {
    return this.totalMinted.value
  }
}
