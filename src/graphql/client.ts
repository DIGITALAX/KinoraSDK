import { RetryLink } from "@apollo/client/link/retry";
import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
} from "@apollo/client";
import { BASE_URL } from "./../../src/constants";

export const client = new ApolloClient({
  link: ApolloLink.from([new RetryLink(), new HttpLink({ uri: BASE_URL })]),
  uri: BASE_URL,
  cache: new InMemoryCache(),
});
