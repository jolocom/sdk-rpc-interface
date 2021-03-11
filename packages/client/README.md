## Installation

This module is published to NPM, to use the latest version you can simply run:

``` bash
yarn install @jolocom/sdk-rpc-client
```

## Usage

The client can be instantiated as follows:

``` typescript
import { JolocomRPCClient } from '@jolocom/sdk-rpc-client'

// The WS endpoint for the locally running SDK RPC server
const serverURL = 'ws://localhost:4040'

const client = new JolocomRPCClient(serverURL)
```

An instance of the RPC client can be used to interact with a locally running instance of the [SDK RPC server]() to initiate and undergo Verifiable Credential issuance and request flows.

### Initiating a credential issuance flow

A new issuance interaction can be started as follows:

``` typescript

const credentialOffer = await client.sendRequest(
  RPCMethods.initiateCredentialOffer,
  {
    // The endpoint to which the Wallet (i.e. the agent of the counterparty) will POST the response
    "callbackURL": "https://example.com/interact",
    "offeredCredentials": [{
      // Must be defined in the configuration file for the server
      "type": "ProofOfEventOrganizerCredential", 
    }],
    // The data to be included in the issued credentials
    claimData: [{
        // Must map to an entry in "offeredCredentials"
        type: "ProofOfEventOrganizerCredential",
        claims: {
          "name": "Joe",
          "surname": "Tester",
          "email": "joe@example.com"
        }
    }]
  }
)

```

This will result in the following JSON-RPC call to the Jolocom-SDK:
```javascipt
{
  "jsonrpc": "2.0", 
  "method": "initiateCredentialOffer", 
  "params": {
    "callbackURL": "https://example.com/interact",
    "offeredCredentials": [{
      "type": "ProofOfEventOrganizerRoleCredential",
    }],
    "claimData": [{
      "type": "ProofOfEventOrganizerRoleCredential",
      "claims": {
        "name": "Joe",
        "surname": "Tester",
        "email": "joe@example.com"
      }
    }]
  },
  "id": 402131
}

```

At this point, the content of the `credentialOffer` object (specifically `credentialOffer.interactionToken`) can be communicated to the Jolocom SmartWallet. This can be done either by encoding the returned JSON Web Token as a QR code, or by formatting it as a deep link. This library exports a set of simple helpers to aid this process:


``` typescript
import { utils } from '@jolocom/sdk-rpc-client'

const qrCode = utils.encodeAsQrCode(credentialOffer.interactionToken)
const deepLink = utils.encodeAsDeepLink(credentialOffer.interactionToken)
```

Once the Wallet has received the request (e.g. by scanning a QR code or by oppening a deep link), the user will be prompted to accept the credentials. If they accept, the Wallet will send a POST request to the endpoint listed in the `callbackURL` field.

In order to complete the interaction (i.e. issue the credentials selected by the user), the following method can be called:

``` typescript

// Example, same structure as the body of the POST request sent by the Wallet.

const userResponse = {
  token: 'eYJ....'
}

const result = await client.sendRequest(
  RPCMethods.processInteractionToken,
  {
    interactionToken: userResponse.token
  }
)
```

The RPC server will process the user response. If the response is valid, the selected credentials will be issued and returned, alongside aditional metadata about the interaction. The response looks as follow:

``` typescript
{
  // Unique identifier for the interaction
  interactionId: '...',
  interactionInfo: {
      type: 'credentialOffer',
      completed: true,
      interactionToken: 'eyJ..._DA',
      state: {
        issuer: 'did:jun:EIiajKrsw7OC-G3I68Hdgij68rneKy3fXLwWtuYsqZ_U',
        subject: 'did:jun:EIiajKrsw7OC-G3I68Hdgij68rneKy3fXLwWtuYsqZ_U',
        // All issued credentials, in JSON form
        issued: [{...}]
      }
  }
}
```

The response includes a number of properties, some are metadata that can be used by the application developer (issued, issuer, subject), e.g. for logging purposes. 

An important field is - `interactionInfo.interactionToken`. This is a base64 encoded interaction token which includes the issued Verifiable Credentials. This interaction token needs to be shared with the user's Wallet (e.g. via a QR code or a deep link), which will result in the issued credentials being stored in their Wallet.

Once this last interaction message is shared with the Wallet, the interaction is completed.

### Initiating a credential request flow

A new credential request interaction can be started as follows:

``` typescript

const credentialRequest = await client.sendRequest(
  RPCMethods.initiateCredentialRequest,
  {
    "callbackURL": "https://example.com/interact",
    "credentialRequirements": [{
      "type": ["VerifiableCredential", "ProofOfEventOrganizerCredential"],
      constraints: [{
          "==": [{ "var": "issuer" }, "did:jolo:abc...fff"]
      }]
    }]
  }
)

```

At this point, the content of the `credentialRequest` object (specifically `credentialRequest.interactionToken`) can be communicated to the Jolocom SmartWallet. This can be done either by encoding the returned JSON Web Token as a QR code, or by formatting it as a deep link. This library exports a set of simple helpers to aid this process:

``` typescript
import { utils } from '@jolocom/sdk-rpc-client'

const qrCode = utils.encodeAsQrCode(credentialRequest.interactionToken)
const deepLink = utils.encodeAsDeepLink(credentialRequest.interactionToken)
```

Once the Wallet has received the request (e.g. by scanning a QR code or by oppening a deep link), the user will be prompted to share matching Verifiable Credentials from their Wallet. The selected VCs will be POSTed to the endpoint listed in the `callbackURL` field.

In order to complete the interaction (i.e. verify the VCs presented by the user), the following method can be called:

``` typescript
// Example, same structure as the body of the POST request sent by the Wallet.

const userResponse = {
  token: 'eYJ....'
}

const result = await client.sendRequest(
  RPCMethods.processInteractionToken,
  {
    interactionToken: userResponse.token
  }
)
```

The RPC server will process the user response. If the response is valid (i.e. correct credential types are presented, all constraints are satisfied, all signatures are valid, nothing is expired), the following response / summary is returned:

``` typescript
{
  interactionId: '...',
  interactionInfo: {
    type: 'credentialRequest',
    completed: true,
    state: {
      subject: 'did:jun:EIiajKrsw7OC-G3I68Hdgij68rneKy3fXLwWtuYsqZ_U',
      // All VCs presented by the user, in JSON form
      credentials: [{...}]
    }
  }
}
```

Unlike the Credential Issuance flow, no extra messages need to be communicated / shared with the Wallet.


### Additional resources

For additional usage examples, check out the following [test cases](). For additional documentation on how to set up and run the RPC server, check out the [corresponding repository](). The JSON RPC data structures exchanged between the client and server are further documented [here]().

Lastly, for additional context on the supported interaction flows (and the structure of the associated messages), check out the Jolocom-Lib documentation, and the Jolocom-SDK documentation.
