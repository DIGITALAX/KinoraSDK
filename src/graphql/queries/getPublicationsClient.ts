import { lensClient } from "./../client";
import {
  PublicationsDocument,
  PublicationsQuery,
  PublicationsRequest,
} from "./../../@types/generated";
import { ApolloError } from "@apollo/client";

const getPublicationsClient = async (
  request: PublicationsRequest,
): Promise<{
  data: PublicationsQuery;
  error: ApolloError | undefined;
}> => {
  try {
    const result = await lensClient.query({
      query: PublicationsDocument,
      variables: {
        request: request,
      },
      fetchPolicy: "no-cache",
    });
    return { data: result.data, error: null };
  } catch (error) {
    console.error("Error fetching video data:", error);
    return { data: null, error };
  }
};
export default getPublicationsClient;
