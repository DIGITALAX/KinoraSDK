import { FetchResult, gql } from "@apollo/client";
import { graphKinoraClient } from "../client";

export const getMilestoneVideos = async (
  questId: number,
  milestoneId: number
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
      query($questId: Int, $milestoneId: Int) {
        milestones(where: {questId: $questId, milestoneId: $milestoneId}, first: 1) {
            videos {
              videoBytes
              react
              quote
              questId
              pubId
              profileId
              playerId
              mirror
              minSecondaryReactOnQuote
              minSecondaryReactOnComment
              minSecondaryQuoteOnComment
              minSecondaryQuoteOnQuote
              minSecondaryMirrorOnQuote
              minSecondaryMirrorOnComment
              minSecondaryCommentOnQuote
              minSecondaryCommentOnComment
              minSecondaryCollectOnQuote
              minSecondaryCollectOnComment
              minPlayCount
              minDuration
              minAVD
              comment
              bookmark
            }
        }
      }
    `),
    variables: {
      questId,
      milestoneId,
    },
    fetchPolicy: "no-cache",
    errorPolicy: "all",
  });

  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({ timedOut: true });
    }, 60000);
    return () => clearTimeout(timeoutId);
  });

  const result: any = await Promise.race([queryPromise, timeoutPromise]);

  timeoutId && clearTimeout(timeoutId);
  if (result.timedOut) {
    return;
  } else {
    return result;
  }
};