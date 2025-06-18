import {
  ApolloClient,
  NormalizedCacheObject,
} from "@apollo/client";
import {
  DeletePostMutation,
  DeletePostRequest,
  DeletePostResponse,
} from "@lens-protocol/client";

const hidePost = async (
  request: DeletePostRequest,
  questEnvokerAuthedClient: ApolloClient<NormalizedCacheObject>,
): Promise<DeletePostResponse> => {
  return (
    await questEnvokerAuthedClient.mutate({
      mutation: DeletePostMutation,
      variables: {
        request,
      },
    })
  )?.data?.value as DeletePostResponse;
};

export default hidePost;
