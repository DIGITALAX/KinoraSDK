import { RetryLink } from "@apollo/client/link/retry";
import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
} from "@apollo/client";
import { GRAPH_BASE_URL, LENS_BASE_URL } from "./../../src/constants";

export const lensClient = new ApolloClient({
  link: ApolloLink.from([
    new RetryLink(),
    new HttpLink({ uri: LENS_BASE_URL }),
  ]),
  uri: LENS_BASE_URL,
  cache: new InMemoryCache(),
});

export const graphClient = new ApolloClient({
  link: ApolloLink.from([
    new RetryLink(),
    new HttpLink({ uri: GRAPH_BASE_URL }),
  ]),
  uri: GRAPH_BASE_URL,
  cache: new InMemoryCache(),
});
