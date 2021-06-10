import { randomBytes } from 'crypto';
import WebSocket from 'ws';
import * as rpc from 'jsonrpc-lite';
import {
  InitiateAuthnRequestOptions,
  InitiateCredentialRequestOptions,
  InitiateOfferOptions,
  ProcessJWTOptions,
  RPCMethods,
} from './types';
import { encodeAsDeepLink, encodeAsQrCode } from './utils'

/**
 * Lightweight WS / JSON-RPC client for interacting with a
 * Jolocom SDK RPC server
 */

export class JolocomRPCClient {
  private wsClient: WebSocket;
  private messageQueue: {}[] = [];
  private pendingRequests: {
    [k: string]: Function;
  } = {};

  /**
   * Instantiates the client.
   * @param {string} wsEndpoint - e.g. ws://localhost:4040, the location of the WS / RPC server.
   * @returns {JolocomRPCClient} - an instance of this client for interacting
   * with the remote server. Will throw in case the connection could not be established.
   */

  constructor(wsEndpoint: string) {
    this.wsClient = new WebSocket(wsEndpoint);
    this.wsClient.on('message', message => {
      const json = JSON.parse(message.toString());
      const response = rpc.parseObject(json);

      if (response.type === rpc.RpcStatusType.error) {
        if (response.payload.id) {
          return this.pendingRequests[response.payload.id](
            response.payload.error,
            null
          );
        }
      }

      if (response.type === rpc.RpcStatusType.success) {
        if (response.type === rpc.RpcStatusType.success) {
          if (response.payload.id) {
            this.pendingRequests[response.payload.id](
              null,
              response.payload.result
            );
          }
        }
      }
    });

    // A simple queue is implemented so messages can be "sent" while
    // the client is still connecting to the server. This code
    // clears the queue. TODO Add delay between calls.
    this.wsClient.on('open', () => {
      this.messageQueue.map(this.sendJSON.bind(this));
    });
  }

  private isConnected() {
    return this.wsClient.readyState === WebSocket.OPEN;
  }

  /**
   * Sends an RPC call to the SDK instance via the configured channel.
   * Will resolve with the server responce when it is received.
   * @param {RPCMethods} method - the RPC method / request type.
   * The RPCMethods enum lists the currently supported calls
   * @param args - the arguments required to call the selected method.
   * @returns a promise of the response returned by the server
   */

  public async sendRequest(
    method: RPCMethods,
    args:
      | InitiateOfferOptions
      | InitiateAuthnRequestOptions
      | InitiateCredentialRequestOptions
      | ProcessJWTOptions
  ) {
    return new Promise<any>((resolve, reject) => {
      this.sendRequestWithCB(method, args, (error, result) => {
        if (error) {
          return reject(error);
        }
        return resolve(result as rpc.SuccessObject);
      });
    });
  }

  /**
   * Internal helper to simplify the `sendRequest` implementation.
   */

  private async sendRequestWithCB(
    method: RPCMethods,
    args:
      | InitiateOfferOptions
      | InitiateAuthnRequestOptions
      | InitiateCredentialRequestOptions
      | ProcessJWTOptions,
    callback: (error: Error, result: {}) => void
  ) {
    const requestID = randomBytes(8).toString('hex');
    const rpcCall = rpc.request(requestID, method, args);

    if (this.isConnected()) {
      this.sendJSON(rpcCall);
    } else {
      this.messageQueue.push(rpcCall);
    }

    this.pendingRequests[requestID] = callback;
  }

  /**
   * Internal helper to simplify sending RPC requests via WS.
   * Given a JSON object, will stringify and send it via the established channel
   * (e.g. WS).
   */

  private async sendJSON(message: {}) {
    this.wsClient.send(JSON.stringify(message));
  }
}

/**
 * Helper functions to aid encoding interaction tokens as deep links or QR codes.
 */

export const utils = {
  encodeAsDeepLink,
  encodeAsQrCode
}
