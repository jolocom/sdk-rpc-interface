import WebSocket, { Server } from 'ws';
import * as rpc from 'jsonrpc-lite';
import { Agent, FlowType } from '@jolocom/sdk';
import {
  CredentialOfferFlowState,
  CredentialRequestFlowState,
} from '@jolocom/sdk/js/interactionManager/types';
import { ISignedCredentialAttrs } from 'jolocom-lib/js/credentials/signedCredential/types';
import { issueFromStateAndClaimData } from './utils';
import { InitiateCredentialRequestOptions, InitiateOfferOptions, RPCMethods } from './types';
import { serverConfig } from './config'

/**
 * A JSON RPC method maps to one of these handlers (by name). Support for additional RPC methods
 * can be added by extending this object.
 */

const getRequestHandlers = (
  agent: Agent,
  claimDataMap: {[k: string]: any} = {}
): { [k in RPCMethods]: Function } => ({
  initiateCredentialRequest: async (args: InitiateCredentialRequestOptions) => {
    if (!args.callbackURL || !args.credentialRequirements.length) {
      throw new Error('Invalid params')
    }

    const token = await agent.credRequestToken(args);
    const { id } = await agent.findInteraction(token);

    return {
      interactionId: id,
      interactionToken: token.encode(),
    };
  },
  initiateCredentialOffer: async (args: InitiateOfferOptions) => {
    if (!args.callbackURL || !args.offeredCredentials.length || !args.claimData.length) {
      throw new Error('Invalid params')
    }

    const token = await agent.credOfferToken(args);
    const { id } = await agent.findInteraction(token);

    claimDataMap[id] = args.claimData

    return {
      interactionId: id,
      interactionToken: token.encode(),
    };
  },
  processInteractionToken: async (args: { interactionToken: string }) => {
    if (!args.interactionToken) {
      throw new Error('Invalid params')
    }

    const interaction = await agent.processJWT(args.interactionToken);

    if (!interaction) {
      throw new Error('Interaction not found');
    }

    /**
     * We might be processing a credential response, or a credential offer response.
     */

    switch (interaction.flow.type) {
      case FlowType.CredentialOffer:
        const issuedCredentials = await issueFromStateAndClaimData(
          interaction.getSummary().state as CredentialOfferFlowState,
          claimDataMap[interaction.id],
          agent,
          interaction.counterparty?.did as string
        );

        const issuanceToken = await interaction.createCredentialReceiveToken(
          issuedCredentials
        );

        return {
          interactionId: interaction.id,
          interactionInfo: {
            type: 'credentialOffer',
            completed: true,
            interactionToken: issuanceToken.encode(),
            state: {
              issuer: agent.idw.did,
              subject: interaction.counterparty?.did,
              issued: issuedCredentials.map(c => c.toJSON()),
            },
          },
        };

      case FlowType.CredentialShare:
        const { state: existingState } = interaction.getSummary();
        const {
          providedCredentials,
        } = existingState as CredentialRequestFlowState;

        return {
          interactionId: interaction.id,
          interactionInfo: {
            type: 'credentialRequest',
            completed: true,
            state: {
              subject: interaction.counterparty?.did,
              credentials: providedCredentials.reduce(
                (credentials, { suppliedCredentials }) => {
                  return [
                    ...credentials,
                    ...suppliedCredentials.map(c => c.toJSON()),
                  ];
                },
                [] as ISignedCredentialAttrs[]
              ),
            },
          },
        };
      default:
        throw new Error(`Cannot handle ${interaction.flow.type} flow type`);
    }
  },
});

/**
 * Starts a new WebSockets server at the specified port. The server exposes a JSON-RPC based
 * interface for interacting with a Jolocom SDK / Agent instance.
 * @param {Agent} agent - An instance of an Agent class (normally instantiated using the jolocom SDK). All requests
 * sent to the SDK via the RPC channel are processed by this agent (i.e. it issues credentials, signs credential request tokens, etc.)
 * @param {number} port - The port on which to expose the WS connection, defaults to 4040
 * @returns {WebSocket.Server} - A configured, running WebSocket server instance
 */

export const createRPCServer = (agent: Agent): WebSocket.Server => {
  const requestHandlers = getRequestHandlers(agent);

  const wss = new Server({
    host: serverConfig.host,
    port: serverConfig.port,
  });

  wss.on('connection', (connection: WebSocket) => {
    connection.on('message', async message => {
      const json = JSON.parse(message.toString());
      const request = rpc.parseObject(json);

      if (request.type !== rpc.RpcStatusType.request) {
        throw new Error(
          `Server received RPC message of type "${request.type}", only "${rpc.RpcStatusType.request}" type currently supported`
        )
      }

      const handler = requestHandlers[request.payload.method as RPCMethods];

      if (!handler) {
        const err = rpc.error(
          request.payload.id,
          new rpc.JsonRpcError(
            `Method "${request.payload.method}" not found`,
            -32601
          )
        );

        return connection.send(err.serialize());
      }

      return handler(request.payload.params as any)
        .then((response: {}) =>
          connection.send(
            JSON.stringify(rpc.success(request.payload.id, response))
          )
        )
        .catch((err: Error) => {
          if (err.message === 'Invalid params') {
            return connection.send(JSON.stringify(
              rpc.error(
                request.payload.id,
                new rpc.JsonRpcError(err.message, -32602)
              )
            ))
          } else {
            return connection.send(JSON.stringify(
              rpc.error(
                request.payload.id,
                new rpc.JsonRpcError(err.message, -32000)
              ))
            )
          }
        }
        );
    });
  });

  return wss;
};
