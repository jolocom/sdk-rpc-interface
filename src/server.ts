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

const getRequestHandlers = (
  agent: Agent,
  claimDataMap: {[k: string]: any} = {}
): { [k in RPCMethods]: Function } => ({
  initiateCredentialRequest: async (args: InitiateCredentialRequestOptions) => {
    const token = await agent.credRequestToken(args);
    const { id } = await agent.findInteraction(token);

    return {
      interactionId: id,
      interactionToken: token.encode(),
    };
  },
  initiateCredentialOffer: async (args: InitiateOfferOptions) => {
    const token = await agent.credOfferToken(args);

    const { id } = await agent.findInteraction(token);

    claimDataMap[id] = args.claimData

    return {
      interactionId: id,
      interactionToken: token.encode(),
    };
  },

  processInteractionToken: async (args: { interactionToken: string }) => {
    const interaction = await agent.processJWT(args.interactionToken);

    if (!interaction) {
      throw new Error('Interaction not found');
    }

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

export const createRPCServer = (agent: Agent) => {
  const requestHandlers = getRequestHandlers(agent);

  const wss = new Server({
    port: 4040,
  });

  wss.on('connection', (connection: WebSocket) => {
    connection.on('message', async message => {
      const json = JSON.parse(message.toString());
      const request = rpc.parseObject(json);

      if (request.type === rpc.RpcStatusType.request) {
        const handler = requestHandlers[request.payload.method as RPCMethods];

        if (!handler) {
          const err = rpc.error(
            request.payload.id,
            new rpc.JsonRpcError(
              `Method ${request.payload.method} not supported`,
              0
            )
          );

          return connection.send(err.serialize());
        }

        // TODO Proper error codes
        return handler(request.payload.params as any)
          .then((response: {}) =>
            connection.send(
              JSON.stringify(rpc.success(request.payload.id, response))
            )
          )
          .catch((err: Error) =>
            JSON.stringify(
              rpc.error(
                request.payload.id,
                new rpc.JsonRpcError(err.message, 0)
              )
            )
          );
      }
    });
  });

  return wss;
};
