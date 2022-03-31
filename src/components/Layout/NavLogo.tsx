import React, { useCallback } from 'react'
import styled from 'styled-components'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { isMobile } from 'react-device-detect'

import { useIsDedicatedTheme } from 'hooks/useTheme'

const Wrapper = styled.div`
  display: flex;
  flex-flow: row nowrap;
  align-items: center;

  &:hover {
    cursor: pointer;
  }

  & > div {
    display: flex;
    align-items: center;
    &:first-child {
      margin-right: 13px;
    }
  }
`

export default function NavLogo() {
  const router = useRouter()
  const isDedicatedTheme = useIsDedicatedTheme()

  const buildUrl = useCallback(
    (path: string) => {
      return isDedicatedTheme ? `/${path}?theme=${router.query.theme}` : `/${path}`
    },
    [router, isDedicatedTheme]
  )

  return (
    <Link href={buildUrl('trade')} passHref>
      <Wrapper>
        <div>
          <Image src="/static/images/LogoImage.svg" alt="App Logo" width={30} height={30} />
        </div>
        {!isMobile && (
          <div>
            <Image src="/static/images/LogoText.svg" width={100} height={50} alt="App Logo" />
          </div>
        )}
      </Wrapper>
    </Link>
  )
}
