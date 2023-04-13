import { https } from 'firebase-functions'
import axios, { AxiosResponse } from 'axios'

interface Key {
  kty: string
  alg: string
  use: string
}

interface Jwks {
  keys: Key[]
}

export const getJwks = https.onRequest(async (req, res) => {
  try {
    const domain = req.query.domain as string

    if (!domain) {
      throw new Error('Please provide a domain.')
    }

    const sanitisedDomain = domain.match(/^https?:\/\/([^/]+)/)?.[1]

    if (!sanitisedDomain) {
      throw new Error('Invalid domain.')
    }

    const response: AxiosResponse<Jwks> = await axios.get(
      `https://${sanitisedDomain}/.well-known/jwks.json`,
    )

    const filteredKeys = response.data.keys.filter(
      (key) =>
        key.kty === 'RSA' &&
        (key.alg === 'RS256' || key.alg === 'RS512') &&
        key.use === 'sig',
    )

    const jwks = { keys: filteredKeys }
    res.status(200).json(jwks)
  } catch (error) {
    console.error(error)

    if (error instanceof Error) {
      if (error.message === 'Please provide a domain.') {
        res.status(400).send('Please provide a domain.')
      } else if (error.message === 'Invalid domain.') {
        res.status(400).send('Invalid domain.')
      } else {
        res.status(500).send('Error retrieving JWKS.')
      }
    } else {
      res.status(500).send('Error retrieving JWKS.')
    }
  }
})
