This repository defines a simple WebSocket server, which exposes a set of methods supported by the [Jolocom-SDK](https://github.com/jolocom/jolocom-sdk/) via a [JSON-RPC](https://www.jsonrpc.org/specification) based interface.
A corresponding client library is available as well, and can be found [here](../client/)

## Starting the server manually

The easiest way to run the server (e.g. for development and testing purposes) is to clone this repository locally, install all dependencies, i.e. using

``` bash

# Alternatively npm can be used
yarn install

# Once the dependencies are installed, the project can be built

yarn build

# And then 

yarn start
```

This will start a new server (using the [default configuration](./src/config.ts)) listening on port `4040`. A instance of the aforementioned RPC client can be used to interact with the running service.


**Using docker-compose**

A `Dockerfile`, as well as a `docker-compose` file are included in the project repository as well. You can simply run `docker-compose up` to build the image and run it in a new container.

For additional documentation on how to interact with this service, as well as usage examples, please check out the [RPC client README](../client/README.md), and the [included tests](./test/basic.test.ts)
