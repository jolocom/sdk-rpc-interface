import { Agent } from '@jolocom/sdk';
import { CredentialOfferFlowState } from '@jolocom/sdk/js/interactionManager/types';
import { issuableCredentialTypes } from './config';

export const issueFromStateAndClaimData = (
  state: CredentialOfferFlowState,
  claimData: {[k: string]: any},
  issuingAgent: Agent,
  subject: string
) => {
  const { selection, offerSummary } = state;

  return Promise.all(
    selection.map(({ type: selectedType }) => {
      const selectedOffer = offerSummary.find(
        offer => offer.type === selectedType
      );

      if (!selectedOffer) {
        throw new Error('Could not find offer for selected type');
      }

      const { claims } = claimData.find(({type} : {type: string}) =>
        type === selectedType
      )


      const metadataForType = issuableCredentialTypes[selectedType];

      if (!metadataForType) {
        throw new Error(
          `No metadata found for issuing credential of type -- ${selectedType}`
        );
      }

      const { context, type, name } = metadataForType;

      return issuingAgent.signedCredential({
        metadata: {
          type,
          context,
          name,
        },
        claim: claims || {},
        subject: subject,
      });
    })
  );
};
