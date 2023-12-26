import {
  ApolloClient,
  FetchResult,
  NormalizedCacheObject,
} from "@apollo/client";
import {
  ActOnOpenActionRequest,
  CreateActOnOpenActionTypedDataDocument,
  CreateActOnOpenActionTypedDataMutation,
} from "./../../@types/generated";

export const act = async (
  request: ActOnOpenActionRequest,
  questEnvokerAuthedClient: ApolloClient<NormalizedCacheObject>,
): Promise<FetchResult<CreateActOnOpenActionTypedDataMutation>> => {
  return await questEnvokerAuthedClient.mutate({
    mutation: CreateActOnOpenActionTypedDataDocument,
    variables: {
      request: request,
    },
  });
};
