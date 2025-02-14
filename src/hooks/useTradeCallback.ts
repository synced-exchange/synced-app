import { useCallback, useMemo } from 'react'
import { TransactionResponse } from '@ethersproject/abstract-provider'
import { Currency, CurrencyAmount, NativeCurrency, Token, ZERO } from '@sushiswap/core-sdk'
import { getAddress } from '@ethersproject/address'
import { SupportedChainId as MuonChainId } from 'lib/synchronizer'

import { useTransactionAdder } from 'state/transactions/hooks'
import { TradeType } from 'state/trade/reducer'

import useWeb3React from './useWeb3'
import { useSynchronizerContract } from './useContract'
import { calculateGasMargin } from 'utils/web3'
import { Muon } from 'lib/synchronizer/muon'
import { toHex } from 'utils/hex'
import { usePartnerId } from './usePartnerId'

export enum TradeCallbackState {
  INVALID = 'INVALID',
  VALID = 'VALID',
}

export default function useTradeCallback(
  currencyA: Currency | undefined,
  currencyB: Currency | undefined,
  amountA: CurrencyAmount<NativeCurrency | Token> | null | undefined,
  amountB: CurrencyAmount<NativeCurrency | Token> | null | undefined,
  tradeType: TradeType
): {
  state: TradeCallbackState
  callback: null | (() => Promise<string>)
  error: string | null
} {
  const { chainId, account, library } = useWeb3React()
  const addTransaction = useTransactionAdder()
  const Synchronizer = useSynchronizerContract()
  const partnerId = usePartnerId()

  const registrar = useMemo(() => {
    if (!currencyA || !currencyB) {
      return undefined
    }
    return tradeType === TradeType.OPEN ? getAddress(currencyB.wrapped.address) : getAddress(currencyA.wrapped.address)
  }, [currencyA, currencyB, tradeType])

  const constructCall = useCallback(async () => {
    try {
      if (!account || !chainId || !(chainId in MuonChainId) || !registrar || !amountA || !Synchronizer) {
        throw new Error('Missing dependencies.')
      }

      const action = tradeType === TradeType.OPEN ? 'buy' : 'sell' // muon
      const methodName = tradeType === TradeType.OPEN ? 'buyFor' : 'sellFor' // synchronizer
      const signatures = await Muon.getSignatures(registrar, action, chainId)

      if (signatures.success === false) {
        throw new Error(`Unable to fetch Muon signatures: ${signatures.error}`)
      }

      console.log(signatures)

      const args = [
        partnerId,
        account,
        registrar,
        toHex(amountA.quotient),
        signatures.data.calldata.price,
        signatures.data.calldata.timestamp,
        signatures.data.calldata.reqId,
        signatures.data.calldata.sigs,
      ]
      console.log('Contract arguments: ', args)

      return {
        address: Synchronizer.address,
        calldata: Synchronizer.interface.encodeFunctionData(methodName, args) ?? '',
        value: 0,
      }
    } catch (error) {
      return {
        error,
      }
    }
  }, [chainId, account, registrar, amountA, Synchronizer, tradeType])

  return useMemo(() => {
    if (!account || !chainId || !library || !Synchronizer || !currencyA || !currencyB) {
      return {
        state: TradeCallbackState.INVALID,
        callback: null,
        error: 'Missing dependencies',
      }
    }
    if (!amountA || amountA.equalTo(ZERO)) {
      return {
        state: TradeCallbackState.INVALID,
        callback: null,
        error: 'No amount provided',
      }
    }
    return {
      state: TradeCallbackState.VALID,
      error: null,
      callback: async function onTrade(): Promise<string> {
        console.log('onTrade callback')
        const call = await constructCall()
        const { address, calldata, value } = call

        if ('error' in call) {
          console.error(call.error)
          if (call.error.message) {
            throw new Error(call.error.message)
          } else {
            throw new Error(`Unexpected error, could not construct calldata: ${call.error}`)
          }
        }

        const tx = !value
          ? { from: account, to: address, data: calldata }
          : { from: account, to: address, data: calldata, value }

        console.log('TRADE TRANSACTION', { tx, value })

        const estimatedGas = await library.estimateGas(tx).catch((gasError) => {
          console.debug('Gas estimate failed, trying eth_call to extract error', call)

          return library
            .call(tx)
            .then((result) => {
              console.debug('Unexpected successful call after failed estimate gas', call, gasError, result)
              return {
                error: gasError.message,
              }
            })
            .catch((callError) => {
              console.debug('Call threw an error', call, callError)
              return {
                error: tradeErrorToUserReadableMessage(callError),
              }
            })
        })

        if ('error' in estimatedGas) {
          throw new Error(estimatedGas.error)
        }

        return library
          .getSigner()
          .sendTransaction({
            ...tx,
            ...(estimatedGas ? { gasLimit: calculateGasMargin(estimatedGas) } : {}),
            // gasPrice /// TODO add gasPrice based on EIP 1559
          })
          .then((response: TransactionResponse) => {
            console.log(response)

            const summary = `Trade ${amountA?.toSignificant()} ${currencyA.symbol} for ${amountB?.toSignificant()} ${
              currencyB.symbol
            }`
            addTransaction(response, { summary })

            return response.hash
          })
          .catch((error) => {
            // if the user rejected the tx, pass this along
            if (error?.code === 4001) {
              throw new Error('Transaction rejected.')
            } else {
              // otherwise, the error was unexpected and we need to convey that
              console.error(`Transaction failed`, error, address, calldata, value)
              throw new Error(`Transaction failed: ${tradeErrorToUserReadableMessage(error)}`)
            }
          })
      },
    }
  }, [account, chainId, library, addTransaction, constructCall, Synchronizer, amountA, amountB, currencyA, currencyB])
}

export function tradeErrorToUserReadableMessage(error: any): string {
  let reason: string | undefined

  while (Boolean(error)) {
    reason = error.reason ?? error.data?.message ?? error.message ?? reason
    error = error.error ?? error.data?.originalError
  }

  if (reason?.indexOf('execution reverted: ') === 0) reason = reason.substring('execution reverted: '.length)

  switch (reason) {
    case 'Synchronizer: INVALID_PARTNER_ID':
      return 'This transaction will not succeed due to an invalid partner ID. Try registering an address via PartnerManager.'
    default:
      if (reason?.indexOf('undefined is not an object') !== -1) {
        console.error(error, reason)
        return ': s'
      }
      return `Unknown error${reason ? `: "${reason}"` : ''}`
  }
}
