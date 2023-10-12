import { gql } from "@apollo/client";
import { authClient } from "../client";

export const LENS_VALUES = `query {
  Publication($request: request, $profileId: ProfileId) {
    publication(request: $request) {
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
  }
}`;

const getLensValues = (
  request: {
    publicationId: string;
  },
  profileId: string,
) => {
  return authClient.query({
    query: gql(LENS_VALUES),
    variables: {
      request,
      profileId,
    },
  });
};

export default getLensValues;
