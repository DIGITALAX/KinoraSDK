import {
  ApolloClient,
  FetchResult,
  NormalizedCacheObject,
} from "@apollo/client";
import {
  ActOnOpenActionDocument,
  ActOnOpenActionMutation,
  ActOnOpenActionRequest,
} from "../../@types/generated";

const actOnGrant = async (
  request: ActOnOpenActionRequest,
  playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>,
): Promise<FetchResult<ActOnOpenActionMutation>> => {
  return await playerAuthedApolloClient.mutate({
    mutation: ActOnOpenActionDocument,
    variables: {
      request: request,
    },
  });
};

export default actOnGrant;
