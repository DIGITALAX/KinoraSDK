import { FetchResult, gql } from "@apollo/client";
import { graphKinoraClient } from "../client";

export const getCompletedMilestones = async (
  playerProfileId: number,
  questId: number,
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
      query($playerProfileId: Int, $questId: Int) {
          milestoneCompleteds(where: {questId: $questId, playerProfileId: $playerProfileId}, orderBy: blockTimestamp) {
              milestone
          }
      }
    `),
    variables: { playerProfileId, questId },
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

export const getCompletedQuests = async (
  playerProfileId: number,
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
        query($playerProfileId: Int) {
          questCompleteds(where: {playerProfileId: $playerProfileId}, orderBy: blockTimestamp) {
              questId
          }
        }
      `),
    variables: { playerProfileId },
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

export const getJoinedQuests = async (
  playerProfileId: number,
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
          query($playerProfileId: Int) {
            players(where: {playerProfileId: $playerProfileId}) {
                questsJoined
            }
          }
        `),
    variables: { playerProfileId },
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

export const getVideoMetricActivity = async (
  playerProfileId: number,
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
            query($playerProfileId: Int) {
              players(where: {playerProfileId: $playerProfileId}) {
                videoActivities {
                    avd
                    duration
                    hasBookmarked
                    hasCommented
                    hasMirrored
                    hasQuoted
                    hasReacted
                    mostReplayedArea
                    playCount
                    playerProfileId
                    profileId
                    pubId
                    secondaryCollectOnComment
                    secondaryCollectOnQuote
                    secondaryCommentOnComment
                    secondaryCommentOnQuote
                    secondaryMirrorOnComment
                    secondaryMirrorOnQuote
                    secondaryQuoteOnComment
                    secondaryQuoteOnQuote
                    secondaryReactOnComment
                    secondaryReactOnQuote
                  }
              }
            }
          `),
    variables: { playerProfileId },
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

export const getDetailsOfPlayer = async (
  playerProfileId: number,
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
        query($playerProfileId: Int) {
            players(where: {playerProfileId: $playerProfileId}) {
                videos {
                    avd
                    duration
                    hasBookmarked
                    hasCommented
                    hasMirrored
                    hasQuoted
                    hasReacted
                    mostReplayedArea
                    playCount
                    playerProfileId
                    profileId
                    pubId
                    secondaryCollectOnComment
                    secondaryCollectOnQuote
                    secondaryCommentOnComment
                    secondaryCommentOnQuote
                    secondaryMirrorOnComment
                    secondaryMirrorOnQuote
                    secondaryQuoteOnComment
                    secondaryQuoteOnQuote
                    secondaryReactOnComment
                    secondaryReactOnQuote
                  }
                  questsJoined
                  questsCompleted
                  profileId
                  eligibile {
                    milestone
                    questId
                    status
                  }
                  milestonesCompleted {
                    questId
                    milestonesCompleted
                  }
            }
        }
    `),
    variables: { playerProfileId },
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

export const getPlayersByQuest = async (
  questId: number,
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
          query($questId: Int) {
            questInstantiateds(where: {questId: $questId}) {
                players {
                  profileId
                }
              }
          }
      `),
    variables: { questId },
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

export const getQuests = async (): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`query {
            questInstantiateds {
              questId
            } 
          }
        `),
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

export const getQuestEnvoker = async (
  profileId: number,
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
    query($profileId: Int) {
        questInstantiateds(where: {profileId: $profileId}) {
          questId
        } 
      }`),
    variables: { profileId },
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

export const getVideoMetrics = async (): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`query {
        videos {
            playerId
            profileId
            pubId
            questId
            quote
            react
            videoBytes
            mirror
            minSecondaryReactOnQuote
            minSecondaryReactOnComment
            minSecondaryQuoteOnQuote
            minSecondaryQuoteOnComment
            minSecondaryMirrorOnComment
            minSecondaryMirrorOnQuote
            minSecondaryCommentOnQuote
            minSecondaryCommentOnComment
            minSecondaryCollectOnQuote
            minSecondaryCollectOnComment
            bookmark
            comment
            minAVD
            minDuration
            minPlayCount
          }
       }
          `),
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

export const getPlaybackIdQuests = async (
  playerId: string,
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`query($playerId: String) {
        videos(where: {playerId: $playerId}) {
            questId
          }
         }
            `),
    variables: {
      playerId,
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

export const getVideoIdQuests = async (
  profileId: number,
  pubId: number,
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`query($profileId: Int, $pubId: Int) {
          videos(where: {profileId: $profileId, pubId: $pubId}) {
              questId
            }
           }`),
    variables: {
      profileId,
      pubId,
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

export const getActivityByPlayerId = async (
  playerId: string,
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
            query($playerId: String) {
                videoActivities(where: {playerId: $playerId}) {
                    avd
                    duration
                    hasBookmarked
                    hasCommented
                    hasMirrored
                    hasQuoted
                    hasReacted
                    mostReplayedArea
                    playCount
                    playerProfileId
                    profileId
                    secondaryReactOnComment
                    secondaryReactOnQuote
                    secondaryQuoteOnQuote
                    pubId
                    playerId
                    secondaryCollectOnComment
                    secondaryCollectOnQuote
                    secondaryCommentOnQuote
                    secondaryCommentOnComment
                    secondaryMirrorOnQuote
                    secondaryQuoteOnComment
                    secondaryMirrorOnComment
                  }
            }
        `),
    variables: { playerId },
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

export const getActivityByPostId = async (
  profileId: number,
  pubId: number,
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
              query($profileId: Int, $pubId: Int) {
                  videoActivities(where: {profileId: $profileId, pubId: $pubId}) {
                      avd
                      duration
                      hasBookmarked
                      hasCommented
                      hasMirrored
                      hasQuoted
                      hasReacted
                      mostReplayedArea
                      playCount
                      playerProfileId
                      profileId
                      secondaryReactOnComment
                      secondaryReactOnQuote
                      secondaryQuoteOnQuote
                      pubId
                      playerId
                      secondaryCollectOnComment
                      secondaryCollectOnQuote
                      secondaryCommentOnQuote
                      secondaryCommentOnComment
                      secondaryMirrorOnQuote
                      secondaryQuoteOnComment
                      secondaryMirrorOnComment
                    }
              }
          `),
    variables: { profileId, pubId },
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
