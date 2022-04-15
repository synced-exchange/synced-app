import React, { useMemo } from 'react'
import styled from 'styled-components'
import Fuse from 'fuse.js'
import { useSelect, SelectSearchOption } from 'react-select-search'
import { Sector } from 'lib/synchronizer'

import useDefaultsFromURL from 'state/trade/hooks'
import { useLongRegistrars } from 'lib/synchronizer/hooks'
import { Search as SearchIcon } from 'components/Icons'

const SearchWrapper = styled.div`
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
  background: ${({ theme }) => theme.bg0};
  border-radius: 10px;
  white-space: nowrap;
  overflow: hidden;
  padding: 0 0.8rem;
  border: 1px solid ${({ theme }) => theme.border2};
`

const Input = styled.input<{
  [x: string]: any
}>`
  height: 40px;
  flex: 1;
  border: none;
  background: transparent;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.text1};

  &:focus,
  &:hover {
    outline: none;
  }

  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    font-size: 0.9rem;
  `}
`

function fuzzySearch(options: SelectSearchOption[]): any {
  const config = {
    keys: ['ticker', 'name'],
    isCaseSensitive: false,
    threshold: 0.2,
  }

  const fuse = new Fuse(options, config)

  return (query: string) => {
    if (!query) {
      return options
    }

    const result = fuse.search(query)
    return result.map((o) => o.item)
  }
}

export function useSearch(selectedSector: Sector) {
  const registrarList = useLongRegistrars()
  const { setURLCurrency } = useDefaultsFromURL()

  const registrars: SelectSearchOption[] = useMemo(() => {
    return registrarList.filter((o) => o.sector === selectedSector).map((o) => ({ ...o, value: o.contract }))
  }, [registrarList, selectedSector])

  const [snapshot, searchProps, optionProps] = useSelect({
    options: registrars,
    value: '',
    search: true,
    filterOptions: fuzzySearch,
    allowEmpty: true,
    closeOnSelect: false,
  })

  return {
    setURLCurrency,
    snapshot,
    searchProps,
    optionProps,
  }
}

export function InputField({ searchProps, placeholder }: { searchProps: any; placeholder: string }) {
  return (
    <SearchWrapper>
      <Input
        {...searchProps}
        title="Search a ticker"
        autoFocus
        type="text"
        placeholder={placeholder}
        spellCheck="false"
        onBlur={() => null}
      />
      <SearchIcon size={20} />
    </SearchWrapper>
  )
}
