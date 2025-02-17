import { DocumentedEndpoint } from '@shared/endpoints/utils';
import * as t from 'io-ts';
import * as apiModel from '../../models';

export const Handshake = DocumentedEndpoint({
  title: 'Handshake',
  description: 'Authenticate the extension by given `publicKey`',
  tags: [],
  Method: 'POST',
  getPath: () => '/v2/handshake',
  Input: {
    Body: t.any,
  },
  Output: t.any,
});

const AddEvents = DocumentedEndpoint({
  Method: 'POST',
  getPath: () => '/v2/events',
  Input: {
    Headers: t.type({
      'X-Tktrex-Version': t.string,
      'X-Tktrex-Build': t.string,
      'X-Tktrex-PublicKey': t.string,
      'X-Tktrex-Signature': t.string,
    }),
    Body: t.array(t.union([apiModel.Events.ContributionEvent, t.any])),
  },
  Output: t.any,
  title: 'Add contribution events',
  description: '',
  tags: ['events'],
});

const GetSearches = DocumentedEndpoint({
  Method: 'GET',
  getPath: () => '/v2/searches',
  Output: apiModel.Public.PublicSearchList,
  title: 'All searches',
  description: 'Get tiktok searches',
  tags: ['searches'],
});

const GetSearchByQuery = DocumentedEndpoint({
  Method: 'GET',
  getPath: ({ query, format }) => `/v2/public/query/${query}/${format}`,
  Input: {
    Params: t.type({
      query: apiModel.Common.What,
      format: apiModel.Common.Format,
    }),
  },
  Output: apiModel.Public.GetSearchByQueryOutput,
  title: 'Search by query',
  tags: ['searches'],
  description: 'Use a `query` of type `What` to filter searches',
});

const GetQueryList = DocumentedEndpoint({
  Method: 'GET',
  getPath: () => '/v2/public/queries/list',
  Output: apiModel.Public.GetQueryListOutput,
  title: 'List queries',
  description: 'List public queries',
  tags: ['searches'],
});

export default {
  AddEvents,
  Handshake,
  GetSearches,
  GetSearchByQuery,
  GetQueryList,
};
