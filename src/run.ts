import { ConnectionOptions, createConnection } from "typeorm"
import { JolocomTypeormStorage } from "@jolocom/sdk-storage-typeorm"
import { JolocomSDK } from "@jolocom/sdk"
import { serverConfig } from './config'
import { createRPCServer } from "./server"

export const init = async () => {
    const db = await createConnection(serverConfig.ormconfig as ConnectionOptions)
    const storage = new JolocomTypeormStorage(db)
    const sdk = new JolocomSDK({ storage })

    const agent = await sdk.initAgent({
        password: serverConfig.agentPassword
    })

    console.log(`Agent instantiated, DID - ${agent.idw.did}`)
    return createRPCServer(agent)
}

init()
