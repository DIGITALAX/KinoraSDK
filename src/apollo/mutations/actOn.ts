import {
  ApolloClient,
  FetchResult,
  NormalizedCacheObject,
} from "@apollo/client";
import {
  ActOnOpenActionDocument,
  ActOnOpenActionMutation,
  ActOnOpenActionRequest,
} from "src/@types/generated";

const actOnGrant = async (
  request: ActOnOpenActionRequest,
  playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>,
): Promise<FetchResult<ActOnOpenActionMutation>> => {
  return playerAuthedApolloClient.mutate({
    mutation: ActOnOpenActionDocument,
    variables: {
      request: request,
    },
  });
};

export default actOnGrant;
