import {
  claimsMetadata,
  ICredentialRequestAttrs,
  CredentialOfferRequestAttrs,
  IAuthenticationAttrs,
  IAuthoritizationAttrs
} from '@jolocom/protocol-ts';
import { Defined } from 'jsonrpc-lite';

export enum RPCMethods {
  updatePublicProfile = 'updatePublicProfile',
  initiateCredentialOffer = 'initiateCredentialOffer',
  initiateCredentialRequest = 'initiateCredentialRequest',
  initiateAuthentication = 'initiateAuthentication',
  initiateAuthorization = 'initiateAuthorization',
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
export type InitiateAuthzRequestOptions = IAuthorizationAttrs

export type ProcessJWTOptions = {
  interactionToken: string;
};

export type UpdatePubProfileRequestOptions = typeof claimsMetadata.publicProfile.claimInterface
