import {
  ICredentialRequestAttrs,
  CredentialOfferRequestAttrs,
  IAuthenticationAttrs
} from '@jolocom/protocol-ts';
import { Defined } from 'jsonrpc-lite';

export enum RPCMethods {
  initiateCredentialOffer = 'initiateCredentialOffer',
  initiateCredentialRequest = 'initiateCredentialRequest',
  initiateAuthentication = 'initiateAuthentication',
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

export type InitiateAuthnRequestOptions = IAuthenticationAttrs

export type ProcessJWTOptions = {
  interactionToken: string;
};
