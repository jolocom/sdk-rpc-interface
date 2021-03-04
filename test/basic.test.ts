import { initiateCredentialOfferRPCMessage, initiateCredentialRequestRPCMessage } from './data'
import { Agent } from '@jolocom/sdk/js/agent';
import { JolocomLib } from 'jolocom-lib';
import { JolocomRPCClient } from '../src/client'
import { createRPCServer } from '../src/server'
import { RPCMethods } from '../src/types'
import { createAgent } from './helpers'
import { SignedCredential } from 'jolocom-lib/js/credentials/signedCredential/signedCredential';
import { Server } from 'ws';

describe('RPC Connector', () => {
  const testSeed = Buffer.from('a'.repeat(32), 'hex')
  let agent: Agent
  let issuedCred: SignedCredential
  let client: JolocomRPCClient
  let server: Server

  beforeAll(async () => {
    agent = await createAgent(testSeed)
    server = createRPCServer(agent)

    client = new JolocomRPCClient('ws://localhost:4040')
    return
  })

  afterAll(async () => {
    return server.close()
  })

  // HealthCheck endpoint?
  // it('correctly spins up', () => {
  // });

  describe('sendRequest', () => {
    it('correctly fails if request method is not supported', async () => {
      //@ts-ignore -- 'example' is not a valid rpc method
     await expect(client.sendRequest('example')).rejects.toBeTruthy()
    })
  })

  it('correctly issues credential offer tokens', async () => {
    const serverResponse = await client.sendRequest(
      RPCMethods.initiateCredentialOffer,
      initiateCredentialOfferRPCMessage
    )


    const interaction = await agent.findInteraction(
      await JolocomLib.parseAndValidate.interactionToken(
        serverResponse.interactionToken,
        agent.idw.identity
      ))

    const response = await interaction.createCredentialOfferResponseToken([{
      type: "ProofOfOrganizerRoleCredential",
    }])

    const {
      interactionId,
      interactionInfo
    } = await client.sendRequest(RPCMethods.processInteractionToken, {
      interactionToken: response.encode()
    })

    expect(interactionId).toStrictEqual(interaction.id)
    expect(interactionInfo.type).toBe('credentialOffer')
    expect(interactionInfo.interactionToken).toBeDefined()
    expect(interactionInfo.completed).toBeTruthy()

    expect(interactionInfo.state.issuer).toBe(agent.idw.did)
    expect(interactionInfo.state.subject).toBe(agent.idw.did)
    expect(interactionInfo.state.issued).toHaveLength(1)

    issuedCred = SignedCredential.fromJSON(interactionInfo.state.issued[0])
    await agent.storage.store.verifiableCredential(issuedCred)
  })

  it('correctly assembles and signs credential request tokens', async () => {
    const creationAttrs = initiateCredentialRequestRPCMessage

    const { interactionId } = await client.sendRequest(
      RPCMethods.initiateCredentialRequest,
      creationAttrs
    )

    const interaction = await agent.findInteraction(interactionId)

    const resp = await interaction.createCredentialResponse([issuedCred.id])

    const { interactionInfo } = await client.sendRequest(RPCMethods.processInteractionToken, {
      interactionToken: resp.encode()
    })

    expect(interactionId).toStrictEqual(interaction.id)
    expect(interactionInfo.type).toBe('credentialRequest')
    expect(interactionInfo).toBeDefined()
    expect(interactionInfo.completed).toBeTruthy()

    expect(interactionInfo.state.subject).toBe(agent.idw.did)
    expect(interactionInfo.state.credentials).toHaveLength(1)
    expect(interactionInfo.state.credentials).toStrictEqual([issuedCred.toJSON()])
  })
});
