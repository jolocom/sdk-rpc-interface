import { entropyToMnemonic } from 'jolocom-lib/js/utils/crypto'
import { JolocomSDK } from '@jolocom/sdk'
import { JolocomTypeormStorage } from '@jolocom/sdk-storage-typeorm'
import { createConnection, ConnectionOptions } from 'typeorm'

const ormconfig = {
  type: 'sqlite',
  database: ':memory:',
  logging: ['error', 'warn', 'schema'],
  entities: [...require('@jolocom/sdk-storage-typeorm').entityList],
  synchronize: true,
  cli: {
    migrationsDir: __dirname + '/migrations',
  },
}

export const createAgent = async (seed: Buffer) => {
  const db = await createConnection(ormconfig as ConnectionOptions)
  const storage = new JolocomTypeormStorage(db)
  const sdk = new JolocomSDK({ storage })

  sdk.setDefaultDidMethod('jun')

  const mnemonic = entropyToMnemonic(seed)
  const agent = await sdk.loadAgentFromMnemonic(mnemonic)

  return agent
}
