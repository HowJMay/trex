import * as t from 'io-ts';
import { Endpoint } from 'ts-endpoint';
import { ContributorPersonalStats } from '../../models/contributor/ContributorPersonalStats';
import { ContributorPersonalSearch, ContributorPersonalSummary } from '../../models/contributor/ContributorPersonalSummary';
import { CreatorStats } from '../../models/CreatorStats';
import { PublicKeyParams } from '../../models/http/params/PublicKey';
import { SearchQuery } from '../../models/http/SearchQuery';

const GetAuthorStatsByVideoId = Endpoint({
  Method: 'GET',
  getPath: ({ videoId }) => `/v1/author/${videoId}`,
  Input: {
    Params: t.type({ videoId: t.string }),
  },
  Output: CreatorStats,
});

const GetPersonalStatsByPublicKey = Endpoint({
  Method: 'GET',
  getPath: ({ publicKey }) => `/v1/personal/${publicKey}`,
  Input: {
    Query: SearchQuery,
    Params: PublicKeyParams,
  },
  Output: ContributorPersonalStats,
});

const GetPersonalSummaryByPublicKey = Endpoint({
  Method: 'GET',
  getPath: ({ publicKey }) => `/v1/personal/${publicKey}/summary/json`,
  Input: {
    Query: SearchQuery,
    Params: PublicKeyParams,
  },
  Output: ContributorPersonalSummary,
});

const GetPersonalSearchByPublicKey = Endpoint({
  Method: 'GET',
  getPath: ({ publicKey }) => `/v1/personal/${publicKey}/search/json`,
  Input: {
    Query: SearchQuery,
    Params: PublicKeyParams,
  },
  Output: ContributorPersonalSearch,
});

export const endpoints = {
  GetAuthorStatsByVideoId,
  GetPersonalStatsByPublicKey,
  GetPersonalSummaryByPublicKey,
  GetPersonalSearchByPublicKey,
};
