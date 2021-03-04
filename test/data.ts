export const initiateCredentialOfferRPCMessage = {
    "callbackURL": "https://condidi.com/interact",
    "offeredCredentials": [{
      "type": "ProofOfEventOrganizerCredential", // Defined in config.ts
      "claimData": {
          "name": "Joe",
          "surname": "Tester",
          "email": "joe@example.com"
      }
    }]
}

export const initiateCredentialRequestRPCMessage = {
    "callbackURL": "https://condidi.com/interact", // This endpoint to which the Wallet will send the response
    "credentialRequirements": [{
      "type": ["VerifiableCredential", "ProofOfEventOrganizerCredential"], // Defined in config.ts
      constraints: [{
          "==": [{ "var": "issuer" }, "did:jolo:abc...fff"]
      }]
    }]
}
