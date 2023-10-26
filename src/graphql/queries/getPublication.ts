import {
  ApolloClient,
  FetchResult,
  NormalizedCacheObject,
} from "@apollo/client";
import {
  PublicationDocument,
  PublicationQuery,
  PublicationRequest,
} from "../../@types/generated";

const getPublication = async (
  request: PublicationRequest,
  playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>,
): Promise<FetchResult<PublicationQuery>> => {
  return await playerAuthedApolloClient.query({
    query: PublicationDocument,
    variables: {
      request: request,
    },
    fetchPolicy: "no-cache",
  });
};
export default getPublication;
