import 'server-only'

export interface Product {
  id: string
  name: string
  description: string
  priceInCents: number
  currency: 'usd'
}

export const PRODUCTS: Product[] = [
  {
    id: 'estuda-plus-monthly',
    name: 'Twisisa Plus — mensal',
    description: 'Acesso a simulados premium, desafios e materiais avançados.',
    priceInCents: 999,
    currency: 'usd',
  },
]

export function getProduct(productId: string) {
  return PRODUCTS.find((product) => product.id === productId)
}
