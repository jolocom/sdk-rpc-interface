import {
  ICredentialRequestAttrs,
  CredentialOfferRequestAttrs,
} from '@jolocom/protocol-ts';
import { Defined } from 'jsonrpc-lite';

export enum RPCMethods {
  initiateCredentialOffer = 'initiateCredentialOffer',
  initiateCredentialRequest = 'initiateCredentialRequest',
  processInteractionToken = 'processInteractionToken',
}

export interface InitiateOfferOptions extends CredentialOfferRequestAttrs {
  claimData: Array<{
    type: string,
    claims: {
      [k: string]: Defined
    }
  }>
}
export type InitiateCredentialRequestOptions = ICredentialRequestAttrs;

export type ProcessJWTOptions = {
  interactionToken: string;
};
