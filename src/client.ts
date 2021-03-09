import { randomBytes } from 'crypto';
import { request } from 'jsonrpc-lite';
import WebSocket from 'ws';
import * as rpc from 'jsonrpc-lite';
import {
  InitiateCredentialRequestOptions,
  InitiateOfferOptions,
  ProcessJWTOptions,
  RPCMethods,
} from './types';

export class JolocomRPCClient {
  private wsClient: WebSocket;
  private messageQueue: {}[] = [];
  private pendingRequests: {
    [k: string]: Function;
  } = {};

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

    this.wsClient.on('open', () => {
      this.messageQueue.map(this.sendJSON.bind(this));
    });
  }

  public get isConnected() {
    return this.wsClient.readyState === WebSocket.OPEN;
  }

  // TODO Disjoint
  public async sendRequest(
    method: RPCMethods,
    args:
      | InitiateOfferOptions
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

  private async sendRequestWithCB(
    method: RPCMethods,
    args:
      | InitiateOfferOptions
      | InitiateCredentialRequestOptions
      | ProcessJWTOptions,
    callback: (error: Error, result: {}) => void
  ) {
    const requestID = randomBytes(8).toString('hex');
    const rpcCall = request(requestID, method, args);

    if (this.isConnected) {
      this.sendJSON(rpcCall);
    } else {
      this.messageQueue.push(rpcCall);
    }

    this.pendingRequests[requestID] = callback;
  }

  private async sendJSON(message: {}) {
    this.wsClient.send(JSON.stringify(message));
  }
}
