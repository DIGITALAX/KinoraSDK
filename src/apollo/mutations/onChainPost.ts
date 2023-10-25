import {
  ApolloClient,
  FetchResult,
  NormalizedCacheObject,
} from "@apollo/client";
import {
  OnchainPostRequest,
  CreateOnchainPostTypedDataMutation,
  CreateOnchainPostTypedDataDocument,
} from "./../../../src/@types/generated";

const onChainPost = async (
  request: OnchainPostRequest,
  questInvokerAuthedClient: ApolloClient<NormalizedCacheObject>,
): Promise<FetchResult<CreateOnchainPostTypedDataMutation>> => {
  return questInvokerAuthedClient.mutate({
    mutation: CreateOnchainPostTypedDataDocument,
    variables: {
      request: request,
    },
  });
};

export default onChainPost;
