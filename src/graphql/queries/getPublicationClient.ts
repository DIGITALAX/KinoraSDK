import {
  PublicationDocument,
  PublicationQuery,
  PublicationRequest,
} from "./../../@types/generated";
import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
  ApolloError,
} from "@apollo/client";
import { RetryLink } from "@apollo/client/link/retry";
import { BASE_URL } from "./../../../src/constants";

const client = new ApolloClient({
  link: ApolloLink.from([new RetryLink(), new HttpLink({ uri: BASE_URL })]),
  uri: BASE_URL,
  cache: new InMemoryCache(),
});

const getPublicationClient = async (
  request: PublicationRequest,
): Promise<{
  data: PublicationQuery;
  error: ApolloError | undefined;
}> => {
  try {
    const result = await client.query({
      query: PublicationDocument,
      variables: {
        request: request,
      },
      fetchPolicy: "no-cache",
    });
    return { data: result.data, error: null };
  } catch (error) {
    console.error("Error fetching video data:", error);
    return { data: null, error };
  }
};
export default getPublicationClient;
