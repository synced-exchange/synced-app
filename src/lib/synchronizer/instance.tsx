import { createSynchronizer } from '@deusfinance/synchronizer-sdk'

import useWeb3React from 'hooks/useWeb3'
import { FALLBACK_CHAIN_ID } from 'constants/chains'
import { PartnerId } from 'constants/addresses'

const synchronizer = createSynchronizer()
export default synchronizer

export function SynchronizerUpdater() {
  const { chainId } = useWeb3React()

  return <synchronizer.Updater chainId={chainId ?? FALLBACK_CHAIN_ID} partnerId={PartnerId.address} />
}

export const hooks = synchronizer.hooks
