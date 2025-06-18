import {
  ApolloClient,
  FetchResult,
  NormalizedCacheObject,
} from "@apollo/client";
import { Post, PostQuery, PostRequest } from "@lens-protocol/client";

const getPublication = async (
  request: PostRequest,
  playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>,
): Promise<Post | null> => {
  return (
    await playerAuthedApolloClient.query({
      query: PostQuery,
      variables: {
        request,
      },
      fetchPolicy: "no-cache",
    })
  )?.data?.value as Post;
};
export default getPublication;
