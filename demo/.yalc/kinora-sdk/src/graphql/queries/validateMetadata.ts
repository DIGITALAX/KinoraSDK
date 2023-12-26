import { FetchResult } from "@apollo/client";
import {
  ValidatePublicationMetadataDocument,
  ValidatePublicationMetadataQuery,
  ValidatePublicationMetadataRequest,
} from "./../../@types/generated";
import { lensClient } from "./../client";

const validateMetadata = async (
  request: ValidatePublicationMetadataRequest,
): Promise<FetchResult<ValidatePublicationMetadataQuery>> => {
  return await lensClient.query({
    query: ValidatePublicationMetadataDocument,
    variables: {
      request: request,
    },
    fetchPolicy: "no-cache",
  });
};
export default validateMetadata;
