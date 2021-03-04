import WebSocket, { Server } from 'ws';
import * as rpc from 'jsonrpc-lite';
import { Agent, FlowType } from '@jolocom/sdk';
import { ICredentialRequestAttrs } from '@jolocom/protocol-ts';
import {
  CredentialOfferFlowState,
  CredentialRequestFlowState,
} from '@jolocom/sdk/js/interactionManager/types';
import { ISignedCredentialAttrs } from 'jolocom-lib/js/credentials/signedCredential/types';

type CredentialIssuanceAttrs = {
  callbackURL: string;
  offeredCredentials: Array<{
    type: string;
    claimData: any;
  }>;
};

const getRequestHandlers = (agent: Agent): { [k: string]: Function } => ({
  initiateCredentialRequest: async (args: ICredentialRequestAttrs) => {
    const token = await agent.credRequestToken(args);
    const { id } = await agent.findInteraction(token);

    return {
      interactionId: id,
      interactionToken: token.encode(),
    };
  },
  initiateCredentialOffer: async (args: CredentialIssuanceAttrs) => {
    const token = await agent.credOfferToken(args);

    const { id } = await agent.findInteraction(token);

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
        const { state } = interaction.getSummary();
        const {
          selection,
          offerSummary: offers,
        } = state as CredentialOfferFlowState;
        const creds = await Promise.all(
          selection.map(selected => {
            const originalOffer = offers.find(
              offer => offer.type === selected.type
            );

            if (!originalOffer) {
              throw new Error('');
            }

            //@ts-ignore Hacky
            const { claimData } = originalOffer;

            return agent.signedCredential({
              metadata: {
                type: ['Verifiable Credential', selected.type],
                context: [],
                name: 'TODO',
              },
              claim: claimData || {},
              //@ts-ignore
              subject: interaction.counterparty?.did,
            });
          })
        );

        const credentialReceive = await interaction.createCredentialReceiveToken(
          creds
        );

        return {
          interactionId: interaction.id,
          interactionInfo: {
            type: 'credentialOffer',
            completed: true,
            interactionToken: credentialReceive.encode(),
            state: {
              issuer: agent.idw.did,
              subject: interaction.counterparty?.did,
              issued: creds.map(c => c.toJSON()),
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
        const handler = requestHandlers[request.payload.method];

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

        // Return error object in case of rejection
        const response = await handler(request.payload.params);

        return connection.send(
          JSON.stringify(rpc.success(request.payload.id, response))
        );
      }
    });
  });

  return wss;
};
