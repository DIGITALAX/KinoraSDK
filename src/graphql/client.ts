import { RetryLink } from "@apollo/client/link/retry";
import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
} from "@apollo/client";
import { LENS_BASE_URL } from "./../constants/index";

export const lensClient = new ApolloClient({
  link: ApolloLink.from([
    new RetryLink(),
    new HttpLink({ uri: LENS_BASE_URL }),
  ]),
  uri: LENS_BASE_URL,
  cache: new InMemoryCache(),
});

export const graphKinoraClient = new ApolloClient({
  link: new HttpLink({
    uri: `https://sdk.digitalax.xyz/`,
  }),
  cache: new InMemoryCache(),
});
