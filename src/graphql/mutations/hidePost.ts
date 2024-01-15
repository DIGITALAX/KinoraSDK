import {
  ApolloClient,
  FetchResult,
  NormalizedCacheObject,
} from "@apollo/client";
import {
  HidePublicationDocument,
  HidePublicationMutation,
  HidePublicationRequest,
} from "generated";

const hidePost = async (
  request: HidePublicationRequest,
  questEnvokerAuthedClient: ApolloClient<NormalizedCacheObject>,
): Promise<FetchResult<HidePublicationMutation>> => {
  return await questEnvokerAuthedClient.mutate({
    mutation: HidePublicationDocument,
    variables: {
      request: request,
    },
  });
};

export default hidePost;
