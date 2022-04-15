import React, { useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import BigNumber from 'bignumber.js'
import { Eye, EyeOff } from 'react-feather'
import { useAppDispatch } from 'state'

import useWeb3React from 'hooks/useWeb3'
import useCurrencyLogo from 'hooks/useCurrencyLogo'
import { Direction } from 'hooks/useTradePage'
import { useIsJadeTheme } from 'hooks/useTheme'
import useRpcChangerCallback from 'hooks/useRpcChangerCallback'
import { useRegistrarByContract } from 'lib/synchronizer/hooks'

import { Balance } from 'state/portfolio/reducer'
import { updatePrice, updateEquity } from 'state/portfolio/actions'
import { useActiveBalances, useShowEquity, useToggleEquity, useTotalEquity } from 'state/portfolio/hooks'
import { useWalletModalToggle } from 'state/application/hooks'

import { formatDollarAmount } from 'utils/numbers'
import { makeHttpRequest } from 'utils/http'
import { FALLBACK_CHAIN_ID, SynchronizerChains } from 'constants/chains'
import { API_BASE_URL } from 'constants/api'

import ImageWithFallback from 'components/ImageWithFallback'
import { Network } from 'components/Icons'
import { Card } from 'components/Card'
import { PrimaryButton } from 'components/Button'

const Wrapper = styled(Card)<{
  border?: boolean
}>`
  border: ${({ theme, border }) => (border ? `1px solid ${theme.border2}` : 'none')};
  padding: 1.25rem 0;

  ${({ theme }) => theme.mediaWidth.upToMedium`
    padding: 0.75rem 0;
  `}
`

const HeaderContainer = styled.div`
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 12.5px;
  padding: 0 1.25rem;

  & > * {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  ${({ theme }) => theme.mediaWidth.upToMedium`
    padding: 0 0.75rem;
  `}
`

const EquityWrapper = styled.div`
  &:hover {
    cursor: pointer;
    color: ${({ theme }) => theme.text2};
  }
`

const Row = styled.div`
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
`

const RowWrapper = styled(Row)`
  gap: 1rem;
  width: 100%;
  padding: 0.5rem 1.25rem;

  &:hover {
    cursor: pointer;
    background: ${({ theme }) => theme.bg1};
  }

  & > * {
    &:last-child {
      margin-left: auto;
    }
  }

  ${({ theme }) => theme.mediaWidth.upToMedium`
    padding: 0.5 0.75rem;
  `}
`

const RowContent = styled.div`
  display: flex;
  flex-flow: column nowrap;
`

const NameWrapper = styled.div<{
  long: boolean
}>`
  display: flex;
  flex-flow: row nowrap;
  gap: 8px;
  align-items: center;
  & > * {
    &:first-child {
      font-size: 0.9rem;
      color: ${({ theme }) => theme.text1};
      ${({ theme }) => theme.mediaWidth.upToMedium`
        font-size: 0.7rem;
      `}
    }
    &:nth-child(2) {
      font-size: 0.7rem;
      color: ${({ theme }) => theme.text2};
      ${({ theme }) => theme.mediaWidth.upToMedium`
        font-size: 0.6rem;
      `}
    }
    &:last-child {
      font-size: 0.5rem;
      color: white;
      padding: 0.1rem 0.2rem;
      border-radius: 3px;
      background: ${({ theme, long }) => (long ? theme.green1 : theme.red1)};
      ${({ theme }) => theme.mediaWidth.upToMedium`
        font-size: 0.4rem;
      `}
    }
  }
`

const StatusWrapper = styled.div`
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  align-items: center;
  padding: 0 1rem;
`

const SwitchBlock = styled.div`
  display: flex;
  flex-flow: column nowrap;
  justify-content: space-between;
  gap: 20px;

  & > p {
    text-align: center;
    font-size: 1.1rem;
    padding: 0px 30px;
  }
`

const PrimaryLabel = styled.div`
  font-size: 12.5px;
  color: ${({ theme }) => theme.text1};

  & > span {
    color: ${({ theme }) => theme.themeColor};
    &:hover {
      cursor: pointer;
    }
  }
`

const SecondaryLabel = styled.div`
  font-size: 12.5px;
  color: ${({ theme }) => theme.text2};
`

const BalanceLabel = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.text2};
`

interface Quote {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  current: number
  change: number
}

type QuoteResponse = {
  success: boolean
  data: Quote
  message: string
} | null

type sortableBalance = [string, Balance]
function sortBalances(a: sortableBalance, b: sortableBalance) {
  return parseFloat(a[1].equity) >= parseFloat(b[1].equity) ? -1 : 1
}

export default function Portfolio() {
  const { chainId, account } = useWeb3React()
  const toggleWalletModal = useWalletModalToggle()
  const isJadeTheme = useIsJadeTheme()
  const rpcChangerCallback = useRpcChangerCallback()

  const balances = useActiveBalances()
  const contracts = useMemo(() => {
    const sorted = Object.entries(balances).sort(sortBalances)
    return sorted.map((list) => list[0])
  }, [balances])

  const toggleEquity = useToggleEquity()
  const showEquity = useShowEquity()

  const isSupportedChainId: boolean = useMemo(() => {
    if (!chainId || !account) return false
    return SynchronizerChains.includes(chainId)
  }, [chainId, account])

  const isWalletConnected: boolean = useMemo(() => {
    return !!account
  }, [account])

  function getStatusLabel(): JSX.Element | null {
    if (!isWalletConnected) {
      return <PrimaryButton onClick={() => toggleWalletModal()}>Connect Wallet</PrimaryButton>
    }

    if (!isSupportedChainId) {
      return (
        <SwitchBlock>
          <Network size={30} style={{ margin: '10px auto' }} />
          <p>
            You are connected to a chain that we don&apos;t support. Please connect to the Fantom network in order view
            your portfolio.
          </p>
          <PrimaryButton onClick={() => rpcChangerCallback(FALLBACK_CHAIN_ID)}>Switch to Fantom Mainnet</PrimaryButton>
        </SwitchBlock>
      )
    }

    if (!contracts.length) {
      return (
        <PrimaryLabel>
          You don&apos;t own any synthetics. Click&nbsp;
          <Link href="/trade" passHref>
            <span>here</span>
          </Link>
          &nbsp;to start trading.
        </PrimaryLabel>
      )
    }
    return null
  }

  return (
    <Wrapper border={isJadeTheme}>
      <HeaderContainer>
        <div>
          Positions
          <SecondaryLabel>{isSupportedChainId ? contracts.length : 0}</SecondaryLabel>
        </div>
        <EquityWrapper onClick={toggleEquity}>
          Equity
          {showEquity ? <Eye size="12.5px" /> : <EyeOff size="12.5px" />}
        </EquityWrapper>
      </HeaderContainer>
      {getStatusLabel() ? (
        <StatusWrapper>{getStatusLabel()}</StatusWrapper>
      ) : (
        <>
          {contracts.map((contract, index) => (
            <RegistrarRow key={index} contract={contract} />
          ))}
        </>
      )}
    </Wrapper>
  )
}

function RegistrarRow({ contract }: { contract: string }) {
  const dispatch = useAppDispatch()
  const registrar = useRegistrarByContract(contract)
  const logo = useCurrencyLogo(registrar?.id, registrar?.symbol)
  const balances = useActiveBalances()
  const showEquity = useShowEquity()
  const totalEquity = useTotalEquity()

  const formattedBalance: string = useMemo(() => {
    const balance = balances[contract]['balance']
    return new BigNumber(balance).toPrecision(9, 1) // ROUND_DOWN
  }, [balances, contract])

  const equity: BigNumber = useMemo(() => {
    const { balance, price } = balances[contract]
    return new BigNumber(balance).times(price)
  }, [balances, contract])

  const fetchQuote = useCallback(async (ticker) => {
    try {
      const { href: url } = new URL(`/stocks/quote?ticker=${ticker}`, API_BASE_URL)
      const result: QuoteResponse = await makeHttpRequest(url)
      if (!result || !result.success) {
        throw new Error(`API returned an error: ${result?.message}`)
      }

      return result.data
    } catch (err) {
      console.error(err)
      return null
    }
  }, [])

  useEffect(() => {
    const getPrice = async () => {
      if (!contract || !registrar) return

      // If within normal trading hours
      if (parseFloat(registrar.price)) {
        dispatch(updatePrice({ contract, price: registrar.price }))
        return
      }

      // Try to use API price (this will only be called once)
      const quote = await fetchQuote(registrar.ticker)
      if (!quote) return
      dispatch(updatePrice({ contract, price: quote.current.toString() }))
    }
    getPrice()
  }, [dispatch, contract, registrar, fetchQuote])

  useEffect(() => {
    dispatch(updateEquity({ contract, equity: equity.toString() }))
  }, [dispatch, contract, equity])

  const equityLabel: string = useMemo(() => {
    if (!showEquity && !parseFloat(totalEquity)) {
      return '-- %'
    }
    return showEquity ? formatDollarAmount(equity.toNumber()) : `${equity.div(totalEquity).times(100).toFixed(2)}%`
  }, [equity, totalEquity, showEquity])

  return (
    <Link href={`/trade?registrarId=${contract}`} passHref>
      <RowWrapper>
        <ImageWithFallback src={logo} width={30} height={30} alt={`${registrar?.symbol}`} round />
        <RowContent>
          <NameWrapper long={registrar?.direction === Direction.LONG}>
            <div>{registrar?.symbol}</div>
            <div>{registrar?.name}</div>
            <div>{registrar?.direction}</div>
          </NameWrapper>
          {showEquity && <BalanceLabel>{formattedBalance}</BalanceLabel>}
        </RowContent>
        <PrimaryLabel>{equityLabel}</PrimaryLabel>
      </RowWrapper>
    </Link>
  )
}
