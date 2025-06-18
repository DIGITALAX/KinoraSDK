import {
  ApolloClient,
  NormalizedCacheObject,
} from "@apollo/client";
import {
  ExecutePostActionMutation,
  ExecutePostActionRequest,
  ExecutePostActionResult,
} from "@lens-protocol/client";

export const act = async (
  request: ExecutePostActionRequest,
  questEnvokerAuthedClient: ApolloClient<NormalizedCacheObject>,
): Promise<ExecutePostActionResult> => {
  return (
    await questEnvokerAuthedClient.mutate({
      mutation: ExecutePostActionMutation,
      variables: {
        request,
      },
    })
  )?.data?.value as ExecutePostActionResult;
};
