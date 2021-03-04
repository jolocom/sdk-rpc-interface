export const initiateCredentialOfferRPCMessage = {
    "callbackURL": "https://condidi.com/interact", // This endpoint to which the Wallet will send the response
    "offeredCredentials": [{
      "type": "ProofOfOrganizerRoleCredential",
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
      "type": ["Credential", "ProofOfOrganizerRoleCredential"], // The type and structure for the credentials relevant to the use case need to be defined
      constraints: [{
          "==": [{ "var": "issuer" }, "did:jolo:abc...fff"]
      }]
    }]
}
