import { lensClient } from "./../client";
import { ApolloError } from "@apollo/client";
import { AnyPost, PostQuery, PostRequest } from "@lens-protocol/client";

const getPublicationClient = async (request: PostRequest): Promise<{
  data: AnyPost | null;
  error: ApolloError | undefined | null | unknown;
}> => {
  try {
    const result = await lensClient.query({
      query: PostQuery,
      variables: {
        request,
      },
      fetchPolicy: "no-cache",
    });
    return { data: result.data?.value, error: null };
  } catch (error) {
    console.error("Error fetching video data:", error);
    return { data: null, error };
  }
};
export default getPublicationClient;
