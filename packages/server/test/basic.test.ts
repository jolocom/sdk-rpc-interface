import { initiateCredentialOfferRPCMessage, initiateCredentialRequestRPCMessage } from './data'
import { Agent } from '@jolocom/sdk/js/agent';
import { JolocomLib } from 'jolocom-lib';
import { JolocomRPCClient } from '../../client/src/index'
import { createRPCServer } from '../src/server'
import { RPCMethods } from '../src/types'
import { createAgent } from './helpers'
import { SignedCredential } from 'jolocom-lib/js/credentials/signedCredential/signedCredential';
import { Server } from 'ws';
import { CredentialOfferFlowState } from '@jolocom/sdk/js/interactionManager/types';

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
      type: "ProofOfEventOrganizerCredential",
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

    const { issued } = interactionInfo.state as CredentialOfferFlowState
    expect(interactionInfo.state.issuer).toBe(agent.idw.did)
    expect(interactionInfo.state.subject).toBe(agent.idw.did)
    expect(issued).toHaveLength(1)
    expect(issued[0].claim).toStrictEqual({
      id: agent.idw.did,
      ...initiateCredentialOfferRPCMessage.claimData[0].claims
    })

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

  describe('errors', () => {
    it('throws in case RPC method is not supported', async () => {
      await expect(client.sendRequest(
        'example' as RPCMethods,
        initiateCredentialOfferRPCMessage
      )).rejects.toBeTruthy()
    })

    it('throws in case initiateCredentialRequest options are mallformed', async () => {
      await expect(client.sendRequest(
        RPCMethods.initiateCredentialRequest,
        {
          ...initiateCredentialRequestRPCMessage,
          callbackURL: ''
        },
      )).rejects.toBeTruthy()

      await expect(client.sendRequest(
        RPCMethods.initiateCredentialRequest,
        {
          ...initiateCredentialRequestRPCMessage,
          credentialRequirements: []
        }
      )).rejects.toBeTruthy()
    }),
    it('throws in case initiateCredentialOfferRequest options are mallformed', async () => {
      await expect(client.sendRequest(
        RPCMethods.initiateCredentialOffer,
        {
          ...initiateCredentialOfferRPCMessage,
          callbackURL: ''
        },
      )).rejects.toBeTruthy()

      await expect(client.sendRequest(
        RPCMethods.initiateCredentialOffer,
        {
          ...initiateCredentialOfferRPCMessage,
          offeredCredentials: []
        }
      )).rejects.toBeTruthy()

      await expect(client.sendRequest(
        RPCMethods.initiateCredentialOffer,
        {
          ...initiateCredentialOfferRPCMessage,
          claimData: []
        }
      )).rejects.toBeTruthy()
    })
  })
});
