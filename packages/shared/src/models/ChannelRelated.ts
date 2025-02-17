import * as t from 'io-ts';

export const ChannelRelated = t.strict(
  {
    id: t.union([t.string, t.undefined]),
    recommendedSource: t.union([t.string, t.null]),
    recommendedChannelCount: t.number,
    percentage: t.number,
  },
  'ChannelRelated'
);

export type ChannelRelated = t.TypeOf<typeof ChannelRelated>;

export const GetRelatedChannelsOutput = t.strict(
  {
    content: t.array(ChannelRelated),
    channelId: t.string,
    authorName: t.union([t.null, t.string]),
    score: t.number,
    totalRecommendations: t.number,
    totalContributions: t.number,
    pagination: t.strict({
      amount: t.number,
    }),
  },
  'GetRelatedChannelsOutput'
);

export type GetRelatedChannelsOutput = t.TypeOf<
  typeof GetRelatedChannelsOutput
>;
