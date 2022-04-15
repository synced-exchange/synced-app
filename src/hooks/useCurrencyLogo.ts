import { useMemo } from 'react'

const LogoMap: { [x: string]: StaticImageData } = {
  DEI: require('/public/static/images/tokens/dei.svg'),
}

export default function useCurrencyLogo(id: string | undefined, symbol: string | undefined): StaticImageData {
  return useMemo(() => {
    try {
      if (symbol && symbol in LogoMap) {
        return LogoMap[symbol]
      }

      return id
        ? require(`/public/static/images/tickers/${id.toUpperCase()}.png`)
        : require('/public/static/images/fallback/ticker.png')
    } catch (err) {
      return require('/public/static/images/fallback/ticker.png')
    }
  }, [id, symbol])
}
