import { FetchResult, gql } from "@apollo/client";
import { graphKinoraClient } from "./../client";

export const getCompletedMilestones = async (
  playerProfileId: number,
  questId: number,
  contractAddress: string
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
      query($playerProfileId: Int, $questId: Int, $contractAddress: String) {
          milestoneCompleteds(where: {questId: $questId, playerProfileId: $playerProfileId, contractAddress: $contractAddress}, orderBy: blockTimestamp) {
              milestone
          }
      }
    `),
    variables: { playerProfileId, questId, contractAddress },
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
  contractAddress: string
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
        query($playerProfileId: Int, $contractAddress: String) {
          questCompleteds(where: {playerProfileId: $playerProfileId, contractAddress: $contractAddress}, orderBy: blockTimestamp) {
              questId
          }
        }
      `),
    variables: { playerProfileId, contractAddress },
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
  contractAddress: string
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
          query($playerProfileId: Int, $contractAddress: String) {
            players(where: {playerProfileId: $playerProfileId, contractAddress: $contractAddress}) {
                questsJoined
            }
          }
        `),
    variables: { playerProfileId, contractAddress },
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
  contractAddress: string
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
            query($playerProfileId: Int, $contractAddress: String) {
              players(where: {playerProfileId: $playerProfileId, contractAddress: $contractAddress}) {
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
    variables: { playerProfileId, contractAddress },
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
  contractAddress: string
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
        query($playerProfileId: Int, $contractAddress: String) {
            players(where: {playerProfileId: $playerProfileId, $contractAddress: contractAddress}) {
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
    variables: { playerProfileId, contractAddress },
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
  contractAddress: string
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
          query($questId: Int, $contractAddress: String) {
            questInstantiateds(where: {questId: $questId, contractAddress: $contractAddress}) {
                players {
                  profileId
                }
              }
          }
      `),
    variables: { questId, contractAddress },
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
  contractAddress: string
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
    query($profileId: Int, $contractAddress: String) {
        questInstantiateds(where: {profileId: $profileId, contractAddress: $contractAddress}) {
          questId
        } 
      }`),
    variables: { profileId, contractAddress },
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
  contractAddress: string
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`query($playerId: String, $contractAddress: String) {
        videos(where: {playerId: $playerId, contractAddress: $contractAddress}) {
            questId
          }
         }
            `),
    variables: {
      playerId,
      contractAddress,
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
  contractAddress: string
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`query($profileId: Int, $pubId: Int, $contractAddress: String) {
          videos(where: {profileId: $profileId, pubId: $pubId, contractAddress: $contractAddress}) {
              questId
            }
           }`),
    variables: {
      profileId,
      pubId,
      contractAddress,
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
  contractAddress: string
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
            query($playerId: String, $contractAddress: String) {
                videoActivities(where: {playerId: $playerId, contractAddress: $contractAddress}) {
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
  contractAddress: string
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
              query($profileId: Int, $pubId: Int, $contractAddress: String) {
                  videoActivities(where: {profileId: $profileId, pubId: $pubId, contractAddress: $contractAddress}) {
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
    variables: { profileId, pubId, contractAddress },
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
