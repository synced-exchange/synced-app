import React, { useState, useCallback } from 'react'
import styled, { useTheme } from 'styled-components'
import { Currency } from '@sushiswap/core-sdk'
import { darken } from 'polished'

import useWeb3React from 'hooks/useWeb3'
import { useCurrencyBalance } from 'state/wallet/hooks'
import { maxAmountSpend } from 'utils/currency'
import useCurrencyLogo from 'hooks/useCurrencyLogo'
import { useRegistrarByContract } from 'lib/synchronizer/hooks'

import DEI from '/public/static/images/tokens/dei.svg'
import ImageWithFallback from 'components/ImageWithFallback'
import RegistrarsModal from 'components/RegistrarsModal'
import { ChevronDown } from 'components/Icons'

const Wrapper = styled.div`
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  background: ${({ theme }) => theme.bg3};
  border-radius: 10px;
  gap: 10px;
  white-space: nowrap;
  overflow: hidden;
  padding: 0.75rem;
  min-height: 5.5rem;
`

const RegistrarPanel = styled.div`
  display: column nowrap;
  justify-content: flex-start;
`

const Row = styled.div`
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 10px;
  color: ${({ theme }) => theme.black};
`

const RegistrarSelect = styled(Row)<{
  select?: boolean
}>`
  padding: 5px 7px;
  border-radius: 20px;
  background: ${({ theme }) => darken(0.1, theme.bg3)};
  color: ${({ theme }) => theme.black};
  font-size: ${({ select }) => select && '0.9rem'};

  &:hover {
    cursor: pointer;
    background: ${({ theme }) => darken(0.05, theme.bg3)};
  }

  ${({ theme, select }) => theme.mediaWidth.upToMedium`
    font-size: ${select && '0.8rem'};
  `}
`

const Balance = styled(Row)`
  font-size: 0.7rem;
  text-align: center;
  margin-top: 5px;
  margin-left: 8px;
  gap: 5px;
  color: ${({ theme }) => theme.text4};

  & > span {
    background: ${({ theme }) => theme.bg1};
    border-radius: 6px;
    padding: 0.25rem 0.3rem;
    font-size: 0.6rem;
    color: white;

    &:hover {
      opacity: 0.7;
      cursor: pointer;
    }
  }

  &:hover {
    cursor: pointer;
  }
`

const InputWrapper = styled.div`
  display: flex;
  flex: 1;
  justify-content: flex-end;
`

const InputField = styled.input`
  text-align: right;
  padding: 0.5rem 0.6rem;
  border: none;
  background: transparent;
  font-size: 1rem;
  color: ${({ theme }) => theme.text4};

  &:focus,
  &:hover {
    outline: none;
  }
`

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

const inputRegex = RegExp(`^\\d*(?:\\\\[.])?\\d*$`) // match escaped "." characters via in a non-capturing group
const NumericalInput = ({
  value,
  onUserInput,
  placeholder,
  ...rest
}: {
  value: string | number
  onUserInput: (input: string) => void
  placeholder: string
} & Omit<React.HTMLProps<HTMLInputElement>, 'ref' | 'onChange' | 'as'>) => {
  const enforcer = (nextUserInput: string) => {
    if (nextUserInput === '' || inputRegex.test(escapeRegExp(nextUserInput))) {
      onUserInput(nextUserInput)
    }
  }

  return (
    <InputWrapper>
      <InputField
        {...rest}
        value={value}
        onChange={(event) => {
          // replace commas with periods
          enforcer(event.target.value.replace(/,/g, '.'))
        }}
        // universal input options
        inputMode="decimal"
        title="Amount"
        autoComplete="off"
        autoCorrect="off"
        // text-specific options
        type="text"
        pattern="^[0-9]*[.,]?[0-9]*$"
        placeholder={placeholder || '0.00'}
        min={0}
        minLength={1}
        maxLength={79}
        spellCheck="false"
      />
    </InputWrapper>
  )
}

export default function InputBox({
  currency,
  value,
  showSelect,
  showMax,
  onChange,
}: {
  currency: Currency | undefined
  value: string
  showSelect?: boolean
  showMax?: boolean
  onChange(x?: string): void
}) {
  const { account } = useWeb3React()
  const theme = useTheme()
  const registrar = useRegistrarByContract(currency?.wrapped.address ?? '')
  const balance = useCurrencyBalance(account ?? undefined, currency ?? undefined)
  const logo = useCurrencyLogo(registrar?.id, currency?.symbol)
  const [modalOpen, setModalOpen] = useState<boolean>(false)

  const handleClick = useCallback(() => {
    if (!balance || !onChange) return
    onChange(maxAmountSpend(balance)?.toExact())
  }, [balance, onChange])

  return (
    <>
      <Wrapper>
        <RegistrarPanel>
          {!currency && showSelect ? (
            <RegistrarSelect onClick={() => setModalOpen(true)} select>
              Select an asset
              <ChevronDown size={15} />
            </RegistrarSelect>
          ) : !currency ? (
            <Row style={{ marginLeft: '5px' }}>
              <ImageWithFallback src={DEI} width={30} height={30} alt="Loading" round />
              DEI
            </Row>
          ) : showSelect ? (
            <RegistrarSelect onClick={() => setModalOpen(true)}>
              <ImageWithFallback src={logo} width={30} height={30} alt={`${currency?.symbol} Logo`} round />
              {currency?.symbol}
              <ChevronDown size={15} color={theme.black} />
            </RegistrarSelect>
          ) : (
            <Row style={{ marginLeft: '5px' }}>
              <ImageWithFallback src={logo} width={30} height={30} alt={`${currency?.symbol} Logo`} round />
              {currency?.symbol}
            </Row>
          )}
          {currency && (
            <Balance onClick={handleClick}>
              {balance ? balance.toSignificant(6) : '0.00'} {currency?.symbol}
              {showMax && <span>MAX</span>}
            </Balance>
          )}
          {!currency && !showSelect && (
            <Balance>
              0.00 DEI
              <span>MAX</span>
            </Balance>
          )}
        </RegistrarPanel>
        {currency ? (
          <NumericalInput value={value || ''} onUserInput={onChange} placeholder={'Enter an amount'} autoFocus />
        ) : (
          <div />
        )}
      </Wrapper>
      <RegistrarsModal isOpen={modalOpen} onDismiss={() => setModalOpen(false)} />
    </>
  )
}
