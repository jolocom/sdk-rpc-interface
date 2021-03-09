import { InitiateCredentialRequestOptions, InitiateOfferOptions } from "../src/types"

/**
 * Used in the test files to test the credential issuance flow
 */
export const initiateCredentialOfferRPCMessage: InitiateOfferOptions = {
    "callbackURL": "https://condidi.com/interact",
    "offeredCredentials": [{
      "type": "ProofOfEventOrganizerCredential", // Must be defined in config.ts
    }],
    claimData: [{
        type: "ProofOfEventOrganizerCredential",
        claims: {
          "name": "Joe",
          "surname": "Tester",
          "email": "joe@example.com"
        }
    }]
}

export const initiateCredentialRequestRPCMessage: InitiateCredentialRequestOptions = {
    "callbackURL": "https://condidi.com/interact",
    "credentialRequirements": [{
      "type": ["VerifiableCredential", "ProofOfEventOrganizerCredential"], // Must be defined in config.ts
      constraints: [{
          "==": [{ "var": "issuer" }, "did:jolo:abc...fff"]
      }]
    }]
}
