import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import {
  DisablePostActionResult,
  DisablePostActionMutation,
  DisablePostActionRequest,
} from "@lens-protocol/client";

export const disableAction = async (
  request: DisablePostActionRequest,
  questEnvokerAuthedClient: ApolloClient<NormalizedCacheObject>,
): Promise<DisablePostActionResult> => {
  return (
    await questEnvokerAuthedClient.mutate({
      mutation: DisablePostActionMutation,
      variables: {
        request,
      },
    })
  )?.data?.value as DisablePostActionResult;
};
