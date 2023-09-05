import { gql } from "@apollo/client";
import { authClient } from "../client";

export const LENS_VALUES = `query($pubId: PubId, $profileId: ProfileId) Publication {
    publication(request: {
      publicationId: $pubId
    }) {
     __typename 
      ... on Post {
        bookmarked(by: $profileId)
        notInterested(by: $profileId)
        reaction(request: {
            profileId: $profileId,
          })
        mirrors(by: $profileId)
      }
    }
  }`;

const getLensValues = (
  pubId: string,
  profileId: string,
) => {
  return authClient.mutate({
    mutation: gql(LENS_VALUES),
    variables: {
      request: {
        pubId,
        profileId,
      },
    },
  });
};

export default getLensValues;
