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
  questInvokerAuthedClient: ApolloClient<NormalizedCacheObject>,
): Promise<FetchResult<CreateOnchainPostTypedDataMutation>> => {
  return await questInvokerAuthedClient.mutate({
    mutation: CreateOnchainPostTypedDataDocument,
    variables: {
      request: request,
    },
  });
};

export default onChainPost;
