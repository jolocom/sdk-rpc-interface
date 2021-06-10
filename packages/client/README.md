## Installation

The client library can be downloaded from `NPM`, by running:

``` bash
yarn install @jolocom/sdk-rpc-client

#Alternatively

npm install @jolocom/sdk-rpc-client
```

In order for this client module to be useful, a instance of the corresponding [RPC server](../server/README.md) needs to be running.

## Usage

The client can be instantiated with the URL of the WebSocket server (can be configured, defaults to `ws://localhost:4040`):

``` typescript
import { JolocomRPCClient } from '@jolocom/sdk-rpc-client'

// The WS endpoint for the locally running SDK RPC server
const serverURL = 'ws://localhost:4040'

const client = new JolocomRPCClient(serverURL)
```

The instance of the RPC client can be used to interact with a locally running instance of the [SDK RPC server](../server/README.md) and initiate / undergo [Verifiable Credential]() issuance and request flows.

### Initiating a credential issuance flow

The following request can be made using the client instance in order to start a new credential issuance flow:

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

The RPC server will process the request, and return a corresponding "Credential Offer" interaction token. The content of the `credentialOffer` object (specifically `credentialOffer.interactionToken`) need to be communicated to the counterparty's SSI agent (e.g. a Jolocom SmartWallet). This can be done either by encoding the returned JSON Web Token as a QR code, or by formatting it as a deep link. The client library exports a set of simple helpers to aid this process:


``` typescript
import { utils } from '@jolocom/sdk-rpc-client'

const qrCode = utils.encodeAsQrCode(credentialOffer.interactionToken)
const deepLink = utils.encodeAsDeepLink(credentialOffer.interactionToken)
```

Once the Wallet has received the request (e.g. by scanning a QR code or by opening a deep link), the user will be prompted to select which of the offered credentials they would like to have issued (in case more than one credential is offered). The Wallet will send a `POST` request with the user selection to the endpoint listed in the `callbackURL` field.

The received user response can be processed to continue the interaction:

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

The RPC server will process the user response. If the response is valid, the selected credentials will be issued and returned alongside additional metadata about the interaction.
The response looks as follow:

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

An important field is - `interactionInfo.interactionToken`. This is a base64 encoded interaction token which includes the issued Verifiable Credentials. This interaction token needs to be shared with the counterparty's Wallet (e.g. via a QR code or a deep link). Once the Wallet receives this last interaction token, the included credentials will be extracted, verified, and stored.

Some of the returned properties (i.e. issued, issuer, subject) are there to be used by the application developer , e.g. for logging purposes, or other application specific business logic.

### Initiating a credential request flow

Initiating and conducting a credential request interaction is fairly similar to the previous case / flow. The interaction can be started as follows:

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

The RPC server will process the request, and return a corresponding "Credential Request" interaction token. The content of the `credentialRequest` object (specifically `credentialRequest.interactionToken`) need to be communicated to the counterparty's SSI agent (e.g. a Jolocom SmartWallet). This can be done either by encoding the returned JSON Web Token as a QR code, or by formatting it as a deep link. The client library exports a set of simple helpers to aid this process:

``` typescript
import { utils } from '@jolocom/sdk-rpc-client'

const qrCode = utils.encodeAsQrCode(credentialRequest.interactionToken)
const deepLink = utils.encodeAsDeepLink(credentialRequest.interactionToken)
```

Once the Wallet has received the request (e.g. by scanning a QR code or by opening a deep link), the user will be prompted to share matching Verifiable Credentials from their Wallet. The selected VCs will be POSTed to the endpoint listed in the `callbackURL` field.

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

The RPC server will process the user response. If the response is valid (e.g. correct credential types are presented, all constraints are satisfied, all signatures are valid, nothing is expired), the following response / summary is returned:

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

### Configuring the remote RPC server

The [Public Profile](https://jolocom-lib.readthedocs.io/en/latest/publicProfile.html) associated with the SSI agent running behind the RPC server can be updated using the following RPC call:

``` typescript
{
  const client = new JolocomRPCClient('ws://localhost:4040')

  client.sendRequest(RPCMethods.updatePublicProfile, {
    name: 'DemoIssuanceService',
    description: 'We issue demo credentials to you!',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Example_image.svg/600px-Example_image.svg.png',
    url: 'https://demo-issuer.com'
  })
}
```

This call only needs to be made once. Subsequent calls can be made to overwrite / update the current profile. Because this operation involves broadcasting a transaction to the Ethereum network, as well as interacting with the IPFS network, it will take roughly one minute to complete.

### Additional resources

The following supporting documents can aid working with this package:
- Detailed documentation of the underlying [JSON-RPC](https://www.jsonrpc.org/specification) data structures can be found [here](https://www.notion.so/jolocom/Jolocom-SDK-RPC-description-8b3c925c6f88438c9f1797897616f158).
- Information on how to configure and run the corresponding RPC server can be found [here](../server/README.md).
- Usage examples can be found in the [test folder](../server/test/basic.test.ts).
