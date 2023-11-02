import {
  ApolloClient,
  FetchResult,
  NormalizedCacheObject,
} from "@apollo/client";
import {
  OnchainPostRequest,
  CreateOnchainPostTypedDataMutation,
  CreateOnchainPostTypedDataDocument,
} from "../../@types/generated";

const onChainPost = async (
  request: OnchainPostRequest,
  questEnvokerAuthedClient: ApolloClient<NormalizedCacheObject>,
): Promise<FetchResult<CreateOnchainPostTypedDataMutation>> => {
  return await questEnvokerAuthedClient.mutate({
    mutation: CreateOnchainPostTypedDataDocument,
    variables: {
      request: request,
    },
  });
};

export default onChainPost;
