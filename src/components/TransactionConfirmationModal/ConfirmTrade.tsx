import React, { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { Currency, CurrencyAmount, NativeCurrency, Token } from '@sushiswap/core-sdk'

import { TradeType } from 'state/trade/reducer'
import { usePlatformFeeCallback, usePartnerFeeCallback } from 'state/synchronizer/hooks'
import useCurrencyLogo from 'hooks/useCurrencyLogo'
import { SubAsset } from 'hooks/useAssetList'
import { Direction } from 'hooks/useTradePage'

import { PrimaryButton } from 'components/Button'
import { IconWrapper, ChevronDown } from 'components/Icons'
import TransactionConfirmationModal, { ConfirmationContent, TransactionErrorContent } from './index'
import ImageWithFallback from 'components/ImageWithFallback'
import { formatDollarAmount } from 'utils/numbers'

const MainWrapper = styled.div`
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  gap: 0.5rem;
  padding: 1.5rem 1.25rem;
  overflow: visible;
`

const BottomWrapper = styled(MainWrapper)`
  gap: 0.5rem;
`

const InputsOutputs = styled.div`
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  gap: 0.25rem;
`

const TokenRow = styled.div`
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 1.25rem;
  font-size: 1.1rem;
  background: ${({ theme }) => theme.bg1};
  padding: 0.5rem;
  border-radius: 10px;

  & > * {
    &:nth-child(2) {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      font-weight: bold;
    }
  }
`

const InfoRow = styled.div<{
  z?: boolean
}>`
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  gap: 5px;
  font-size: 0.8rem;
  overflow: visible;

  & > * {
    overflow: visible;
    position: relative;
    z-index: 0;
    &:last-child {
      color: ${({ theme }) => theme.text3};
    }
  }
`

const Disclaimer = styled.div`
  display: block;
  align-text: center;
  text-align: center;
  font-size: 0.7rem;
  border-radius: 5px;
  padding: 0.7rem;
`

const FeeLabel = styled.div`
  display: inline-flex;
  position: relative;
  border-bottom: 1px dotted ${({ theme }) => theme.text3};
  text-align: right;

  & > span {
    visibility: hidden;
    background: black;
    color: #fff;
    text-align: center;
    border-radius: 6px;
    padding: 5px 0;
    position: absolute;
    top: 150%;
    right: 0;
    margin-left: -100%;
    font-size: 8px;

    &:after {
      content: '';
      position: absolute;
      bottom: 100%;
      left: 50%;
      margin-left: -5px;
      border-width: 5px;
      border-style: solid;
      border-color: transparent transparent black transparent;
    }
  }

  &:hover {
    & > span {
      visibility: visible;
    }
  }
`

export default function ConfirmTrade({
  isOpen,
  onDismiss,
  onConfirm,
  attemptingTxn,
  txHash,
  tradeErrorMessage,
  currencyIn,
  currencyOut,
  asset,
  amountIn,
  amountOut,
  tradeType,
  direction,
}: {
  isOpen: boolean
  onDismiss: () => void
  onConfirm: () => void
  attemptingTxn: boolean
  txHash: string
  tradeErrorMessage?: string
  currencyIn: Currency | undefined
  currencyOut: Currency | undefined
  asset: SubAsset | undefined
  amountIn: CurrencyAmount<NativeCurrency | Token> | null | undefined
  amountOut: CurrencyAmount<NativeCurrency | Token> | null | undefined
  tradeType: TradeType
  direction: Direction
}) {
  const theme = useTheme()
  const logoIn = useCurrencyLogo(tradeType === TradeType.OPEN ? undefined : asset?.id, currencyIn?.symbol)
  const logoOut = useCurrencyLogo(tradeType === TradeType.CLOSE ? undefined : asset?.id, currencyOut?.symbol)
  const getPlatformFee = usePlatformFeeCallback()
  const getPartnerFee = usePartnerFeeCallback()

  const feeAmount: string | null = useMemo(() => {
    if (!amountIn || !amountOut || !asset) return null
    return tradeType === TradeType.OPEN
      ? amountIn.multiply(asset.fee).toExact()
      : amountOut.multiply(asset.fee).toExact()
  }, [amountIn, amountOut, asset, tradeType])

  const feeLabel = useMemo(() => {
    if (!asset || !feeAmount) return ''
    return `${asset.fee.toSignificant()}% / ${feeAmount} DEI`
  }, [asset, feeAmount])

  const feeToolTip = useMemo(() => {
    if (!asset) return null
    const platformFee = getPlatformFee(asset.sector).times(100)
    const partnerFee = getPartnerFee(asset.sector).times(100)
    return `${platformFee.toString()}% protocol + ${partnerFee.toString()}% dSynths`
  }, [asset, getPlatformFee, getPartnerFee])

  const priceLabel = useMemo(() => {
    return asset ? `${formatDollarAmount(Number(asset.price))}$ / ${asset.id}` : ''
  }, [asset])

  const summary = useMemo(() => {
    if (!amountIn || !amountOut || !currencyIn || !currencyOut) return ''
    return `Trade ${amountIn.toSignificant()} ${currencyIn.symbol} for ${amountOut.toSignificant()} ${
      currencyOut.symbol
    }`
  }, [amountIn, amountOut, currencyIn, currencyOut])

  function getInputsOutputs(): JSX.Element {
    return (
      <InputsOutputs>
        {currencyIn && (
          <TokenRow>
            <ImageWithFallback src={logoIn} alt={`${currencyIn.name} Logo`} width={40} height={40} round />
            <div>{amountIn?.toSignificant()}</div>
            <div>{currencyIn.symbol}</div>
          </TokenRow>
        )}
        <IconWrapper style={{ alignSelf: 'center' }} stroke={theme.text1}>
          <ChevronDown />
        </IconWrapper>
        {currencyOut && (
          <TokenRow>
            <ImageWithFallback src={logoOut} alt={`${currencyOut.name} Logo`} width={40} height={40} round />
            <div>{amountOut?.toSignificant()}</div>
            <div>{currencyOut.symbol}</div>
          </TokenRow>
        )}
      </InputsOutputs>
    )
  }

  function getConfirmationContent() {
    return (
      <ConfirmationContent
        title="Confirm Trade"
        onDismiss={onDismiss}
        mainContent={
          <MainWrapper>
            {getInputsOutputs()}
            <InfoRow style={{ marginTop: '10px' }}>
              <div>{currencyOut?.symbol} Received: </div>
              <div>
                {amountOut?.toSignificant()} {currencyOut?.symbol}
              </div>
            </InfoRow>
            <InfoRow>
              <div>Price</div>
              <div>{priceLabel}</div>
            </InfoRow>
            <InfoRow>
              <div>Price Impact</div>
              <div>0%</div>
            </InfoRow>
            <InfoRow>
              <div>Protocol Fee: </div>
              <FeeLabel>
                {feeLabel} <span>{feeToolTip}</span>
              </FeeLabel>
            </InfoRow>
            <InfoRow>
              <div>Trade</div>
              <div>
                {tradeType} {direction}
              </div>
            </InfoRow>
          </MainWrapper>
        }
        bottomContent={
          <BottomWrapper>
            <Disclaimer>
              Amounts are estimated, you will receive at least {amountOut?.toSignificant()} {currencyOut?.symbol}.
            </Disclaimer>
            <PrimaryButton onClick={onConfirm}>Confirm</PrimaryButton>
          </BottomWrapper>
        }
      />
    )
  }

  return (
    <TransactionConfirmationModal
      isOpen={isOpen}
      onDismiss={onDismiss}
      attemptingTxn={attemptingTxn}
      hash={txHash}
      summary={summary}
      currencyToAdd={currencyOut}
      content={
        tradeErrorMessage ? (
          <TransactionErrorContent onDismiss={onDismiss} message={tradeErrorMessage} />
        ) : (
          getConfirmationContent()
        )
      }
    />
  )
}
