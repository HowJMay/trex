/* eslint-disable import/first */
jest.mock('axios');

import {
  GuardoniExperimentArb,
  PostDirectiveSuccessResponseArb,
} from '@shared/arbitraries/Directive.arb';
import {
  ComparisonDirectiveRowArb,
  ComparisonDirectiveArb,
} from '@yttrex/shared/arbitraries/ComparisonDirective.arb';
import { SearchDirectiveArb } from '@tktrex/shared/arbitraries/SearchDirective.arb';
import * as tests from '@shared/test';
import axios from 'axios';
import differenceInMilliseconds from 'date-fns/differenceInMilliseconds';
import * as fs from 'fs';
import * as path from 'path';
import { GetGuardoniCLI, GuardoniCLI } from '../src/guardoni/cli';
import { csvStringifyTE } from '../src/guardoni/utils';
import { puppeteerMock } from '../__mocks__/puppeteer.mock';

const axiosMock = axios as jest.Mocked<typeof axios>;
axiosMock.create.mockImplementation(() => axiosMock);

const basePath = path.resolve(__dirname, '../');
const profileName = 'profile-test-99';
const ytExtensionDir = path.resolve(basePath, '../yttrex/extension/build');
const tkExtensionDir = path.resolve(basePath, '../tktrex/extension/build');

describe('CLI', () => {
  const evidenceTag = 'test-tag';
  let experimentId: string;
  let guardoni: GuardoniCLI;

  jest.setTimeout(60 * 1000);

  beforeAll(async () => {
    fs.mkdirSync(path.resolve(basePath, 'experiments'), {
      recursive: true,
    });

    fs.statSync(ytExtensionDir, { throwIfNoEntry: true });
    fs.statSync(tkExtensionDir, { throwIfNoEntry: true });

    const comparisonCSVContent = await csvStringifyTE(
      tests.fc.sample(ComparisonDirectiveRowArb, 5),
      { header: true, encoding: 'utf-8' }
    )();

    if (comparisonCSVContent._tag === 'Left') {
      throw comparisonCSVContent.left as any;
    }

    fs.writeFileSync(
      path.resolve(basePath, 'experiments/experiment-comparison.csv'),
      comparisonCSVContent.right,
      'utf-8'
    );

    const searchCSVContent = await csvStringifyTE(
      tests.fc.sample(SearchDirectiveArb, 10),
      { header: true, encoding: 'utf-8' }
    )();

    if (searchCSVContent._tag === 'Left') {
      throw searchCSVContent.left as any;
    }

    fs.writeFileSync(
      path.resolve(basePath, 'experiments/experiment-search.csv'),
      searchCSVContent.right,
      'utf-8'
    );
  });

  afterAll(() => {
    fs.rmSync(path.resolve(basePath, 'profiles', profileName), {
      recursive: true,
    });
    fs.rmSync(path.resolve(basePath, 'experiments/experiment-search.csv'));
    fs.rmSync(path.resolve(basePath, 'experiments/experiment-comparison.csv'));
  });

  describe('Platform: youtube ', () => {
    guardoni = GetGuardoniCLI(
      {
        chromePath: '/usr/bin/chrome',
        basePath,
        headless: false,
        verbose: false,
        profileName: profileName,
        yt: {
          name: 'youtube',
          backend: process.env.YT_BACKEND as string,
          frontend: undefined,
          extensionDir: ytExtensionDir,
          proxy: undefined,
        },
        tk: {
          name: 'tiktok',
          backend: process.env.TK_BACKEND as string,
          frontend: undefined,
          extensionDir: tkExtensionDir,
          proxy: undefined,
        },
        loadFor: 3000,
        evidenceTag,
        advScreenshotDir: undefined,
        excludeURLTag: undefined,
      },
      basePath,
      puppeteerMock,
      'youtube'
    );

    describe('Register an experiment from a CSV', () => {
      test('fails when the file path is wrong', async () => {
        // mocks

        await expect(
          guardoni.run({
            run: 'register-csv',
            file: path.resolve(__dirname, '../fake-file') as any,
            type: 'search',
          })()
        ).resolves.toMatchObject({
          _tag: 'Left',
          left: {
            message: `Failed to read csv file ${basePath}/fake-file`,
          },
        });
      });

      test('fails when csv file is incompatible with type "comparison"', async () => {
        await expect(
          guardoni.run({
            run: 'register-csv',
            file: path.resolve(
              __dirname,
              '../experiments/experiment-search.csv'
            ) as any,
            type: 'comparison',
          })()
        ).resolves.toMatchObject({
          _tag: 'Left',
          left: {
            name: 'CSVParseError',
            message:
              'The given CSV is not compatible with directive "comparison"',
          },
        });
      });

      test('fails when server response is an error', async () => {
        axiosMock.request.mockResolvedValueOnce({
          data: { error: { message: 'Server Error' } },
        });

        const result: any = await guardoni.run({
          run: 'register-csv',
          type: 'comparison',
          file: path.resolve(
            __dirname,
            '../experiments/experiment-comparison.csv'
          ) as any,
        })();

        expect(result).toMatchObject({
          _tag: 'Left',
          left: {
            message: 'Server Error',
          },
        });
      });

      test('succeeds with new experiment with type "comparison" and proper csv file', async () => {
        // return experiment
        axiosMock.request.mockResolvedValueOnce({
          data: {
            ...tests.fc.sample(PostDirectiveSuccessResponseArb, 1)[0],
            status: 'created',
          },
        });

        const result: any = await guardoni.run({
          run: 'register-csv',
          type: 'comparison',
          file: path.resolve(
            __dirname,
            '../experiments/experiment-comparison.csv'
          ) as any,
        })();

        expect(result).toMatchObject({
          _tag: 'Right',
          right: {
            message: 'Experiment created successfully',
          },
        });

        experimentId = result.right.values[0].experimentId;
      });

      test('success with type comparison and proper csv file', async () => {
        // return experiment
        axiosMock.request.mockResolvedValueOnce({
          data: {
            ...tests.fc.sample(PostDirectiveSuccessResponseArb, 1)[0],
            status: 'exist',
          },
        });

        const result: any = await guardoni.run({
          run: 'register-csv',
          type: 'comparison',
          file: path.resolve(
            __dirname,
            '../experiments/experiment-comparison.csv'
          ) as any,
        })();

        expect(result).toMatchObject({
          _tag: 'Right',
          right: {
            message: 'Experiment already available',
          },
        });

        experimentId = result.right.values[0].experimentId;
      });
    });

    describe('List public experiments', () => {
      test('succeeds with empty list', async () => {
        // return directives
        axiosMock.request.mockResolvedValueOnce({
          data: [],
        });

        const result: any = await guardoni.run({
          run: 'list',
        })();

        expect(result).toMatchObject({
          _tag: 'Right',
          right: {
            message: 'Experiments List',
            values: [
              {
                experiments: [],
              },
            ],
          },
        });
      });

      test('succeeds with some results', async () => {
        const directives = tests.fc.sample(GuardoniExperimentArb, 2);
        // return directives
        axiosMock.request.mockResolvedValueOnce({
          data: directives,
        });

        const result: any = await guardoni.run({
          run: 'list',
        })();

        expect(result).toMatchObject({
          _tag: 'Right',
          right: {
            message: 'Experiments List',
            values: directives.map((d) => ({ [d.experimentId]: d })),
          },
        });
      });
    });

    describe('experiment', () => {
      test('fails when experiment id is empty', async () => {
        await expect(
          guardoni.run({ run: 'experiment', experiment: '' as any })()
        ).resolves.toMatchObject({
          _tag: 'Left',
          left: {
            message: 'Empty experiment id',
            details: ['Invalid value "" supplied to : NonEmptyString'],
          },
        });
      });

      test('fails when receive an error during experiment conclusion', async () => {
        const data = tests.fc.sample(ComparisonDirectiveArb, 2).map((d) => ({
          ...d,
          loadFor: 1000,
          watchFor: '2s',
        }));

        // return directive
        axiosMock.request.mockResolvedValueOnce({
          data,
        });

        axiosMock.request.mockResolvedValueOnce({
          data: {
            acknowledged: false,
          },
        });

        const start = new Date();
        const result: any = await guardoni.run({
          run: 'experiment',
          experiment: experimentId as any,
        })();
        const end = new Date();

        expect(result).toMatchObject({
          _tag: 'Left',
          left: {
            message: "Can't conclude the experiment",
            details: [],
          },
        });

        expect(differenceInMilliseconds(end, start)).toBeGreaterThan(
          (2 + 3) * 2 * 100
        );
      });

      test('succeed when experimentId has valid "comparison" directives', async () => {
        // return directive
        axiosMock.request.mockResolvedValueOnce({
          data: tests.fc.sample(ComparisonDirectiveArb, 2).map((d) => ({
            ...d,
            loadFor: 1000,
            watchFor: '1s',
          })),
        });

        axiosMock.request.mockResolvedValueOnce({
          data: {
            acknowledged: true,
          },
        });

        const result: any = await guardoni.run({
          run: 'experiment',
          experiment: experimentId as any,
        })();

        expect(result).toMatchObject({
          _tag: 'Right',
          right: {
            message: 'Experiment completed',
            values: [
              {
                directiveType: 'comparison',
              },
            ],
          },
        });
      });
    });

    describe('auto', () => {
      test('succeeds when value is "1"', async () => {
        // return directive
        axiosMock.request.mockResolvedValueOnce({
          data: tests.fc.sample(ComparisonDirectiveArb, 2).map((d) => ({
            ...d,
            loadFor: 1000,
            watchFor: '1s',
          })),
        });

        axiosMock.request.mockResolvedValueOnce({
          data: {
            acknowledged: true,
          },
        });

        const result: any = await guardoni.run({ run: 'auto', value: '1' })();

        expect(result).toMatchObject({
          _tag: 'Right',
          right: {
            message: 'Experiment completed',
            values: [
              {
                directiveType: 'comparison',
                evidenceTag: evidenceTag,
              },
            ],
          },
        });
      });

      test('succeeds when value is "2"', async () => {
        // return directive
        axiosMock.request.mockResolvedValueOnce({
          data: tests.fc.sample(ComparisonDirectiveArb, 10).map((d) => ({
            ...d,
            watchFor: '1s',
          })),
        });

        axiosMock.request.mockResolvedValueOnce({
          data: {
            acknowledged: true,
          },
        });

        const result: any = await guardoni.run({ run: 'auto', value: '2' })();

        expect(result).toMatchObject({
          _tag: 'Right',
          right: {
            message: 'Experiment completed',
            values: [
              {
                directiveType: 'comparison',
              },
            ],
          },
        });
      });
    });
  });

  describe('Platform: tiktok', () => {
    guardoni = GetGuardoniCLI(
      {
        chromePath: '/usr/bin/chrome',
        basePath: './',
        headless: false,
        verbose: false,
        profileName: profileName,
        yt: {
          name: 'youtube',
          backend: process.env.YT_BACKEND as string,
          frontend: undefined,
          extensionDir: ytExtensionDir,
          proxy: undefined,
        },
        tk: {
          name: 'tiktok',
          backend: process.env.TK_BACKEND as string,
          frontend: undefined,
          extensionDir: tkExtensionDir,
          proxy: undefined,
        },
        loadFor: 3000,
        evidenceTag,
        advScreenshotDir: undefined,
        excludeURLTag: undefined,
      },
      basePath,
      puppeteerMock,
      'tiktok'
    );

    describe('Register an experiment from a CSV', () => {
      test('fails when the file path is wrong', async () => {
        // mocks

        await expect(
          guardoni.run({
            run: 'register-csv',
            file: path.resolve(__dirname, '../fake-file') as any,
            type: 'search',
          })()
        ).resolves.toMatchObject({
          _tag: 'Left',
          left: {
            message: `Failed to read csv file ${basePath}/fake-file`,
          },
        });
      });

      test('fails when csv file is incompatible with type "search"', async () => {
        await expect(
          guardoni.run({
            run: 'register-csv',
            file: path.resolve(
              __dirname,
              '../experiments/experiment-comparison.csv'
            ) as any,
            type: 'search',
          })()
        ).resolves.toMatchObject({
          _tag: 'Left',
          left: {
            name: 'CSVParseError',
            message: 'The given CSV is not compatible with directive "search"',
          },
        });
      });

      test('fails when server response is an error', async () => {
        axiosMock.request.mockResolvedValueOnce({
          data: { error: { message: 'Server Error' } },
        });

        const result: any = await guardoni.run({
          run: 'register-csv',
          type: 'comparison',
          file: path.resolve(
            __dirname,
            '../experiments/experiment-comparison.csv'
          ) as any,
        })();

        expect(result).toMatchObject({
          _tag: 'Left',
          left: {
            message: 'Server Error',
          },
        });
      });

      test('succeeds with new experiment with type "search" and proper csv file', async () => {
        // return experiment
        axiosMock.request.mockResolvedValueOnce({
          data: {
            ...tests.fc.sample(PostDirectiveSuccessResponseArb, 1)[0],
            status: 'created',
          },
        });

        const result: any = await guardoni.run({
          run: 'register-csv',
          type: 'search',
          file: path.resolve(__dirname, '../experiments/tk-search.csv') as any,
        })();

        expect(result).toMatchObject({
          _tag: 'Right',
          right: {
            message: 'Experiment created successfully',
          },
        });

        experimentId = result.right.values[0].experimentId;
      });

      test('success with type "search" and proper csv file', async () => {
        // return experiment
        axiosMock.request.mockResolvedValueOnce({
          data: {
            ...tests.fc.sample(PostDirectiveSuccessResponseArb, 1)[0],
            status: 'exist',
          },
        });

        const result: any = await guardoni.run({
          run: 'register-csv',
          type: 'comparison',
          file: path.resolve(
            __dirname,
            '../experiments/experiment-comparison.csv'
          ) as any,
        })();

        expect(result).toMatchObject({
          _tag: 'Right',
          right: {
            message: 'Experiment already available',
          },
        });

        experimentId = result.right.values[0].experimentId;
      });

      test('succeeds with type "search" and proper csv file', async () => {
        // return experiment
        axiosMock.request.mockResolvedValueOnce({
          data: {
            ...tests.fc.sample(PostDirectiveSuccessResponseArb, 1)[0],
            status: 'exist',
          },
        });

        const result: any = await guardoni.run({
          run: 'register-csv',
          type: 'search',
          file: path.resolve(
            __dirname,
            '../experiments/experiment-search.csv'
          ) as any,
        })();

        expect(result).toMatchObject({
          _tag: 'Right',
          right: {
            message: 'Experiment already available',
          },
        });

        experimentId = result.right.values[0].experimentId;
      });
    });

    describe('List public experiments', () => {
      test('succeeds with empty list', async () => {
        // return directives
        axiosMock.request.mockResolvedValueOnce({
          data: [],
        });

        const result: any = await guardoni.run({
          run: 'list',
        })();

        expect(result).toMatchObject({
          _tag: 'Right',
          right: {
            message: 'Experiments List',
            values: [
              {
                experiments: [],
              },
            ],
          },
        });
      });

      test('succeeds with some results', async () => {
        const directives = tests.fc.sample(GuardoniExperimentArb, 2);
        // return directives
        axiosMock.request.mockResolvedValueOnce({
          data: directives,
        });

        const result: any = await guardoni.run({
          run: 'list',
        })();

        expect(result).toMatchObject({
          _tag: 'Right',
          right: {
            message: 'Experiments List',
            values: directives.map((d) => ({ [d.experimentId]: d })),
          },
        });
      });
    });

    describe('experiment', () => {
      test('fails when experiment id is empty', async () => {
        await expect(
          guardoni.run({ run: 'experiment', experiment: '' as any })()
        ).resolves.toMatchObject({
          _tag: 'Left',
          left: {
            message: 'Empty experiment id',
            details: ['Invalid value "" supplied to : NonEmptyString'],
          },
        });
      });

      test('fails when receive an error during experiment conclusion', async () => {
        const data = tests.fc.sample(SearchDirectiveArb, 2).map((d) => ({
          ...d,
          loadFor: 1000,
          watchFor: '2s',
        }));

        // return directive
        axiosMock.request.mockResolvedValueOnce({
          data,
        });

        axiosMock.request.mockResolvedValueOnce({
          data: {
            acknowledged: false,
          },
        });

        const start = new Date();
        const result: any = await guardoni.run({
          run: 'experiment',
          experiment: experimentId as any,
        })();
        const end = new Date();

        expect(result).toMatchObject({
          _tag: 'Left',
          left: {
            message: "Can't conclude the experiment",
            details: [],
          },
        });

        expect(differenceInMilliseconds(end, start)).toBeGreaterThan(
          (2 + 3) * 2 * 100
        );
      });

      test('succeed when experimentId has valid "search" directive', async () => {
        // return directive
        axiosMock.request.mockResolvedValueOnce({
          data: tests.fc.sample(SearchDirectiveArb, 2).map((d) => ({
            ...d,
            loadFor: 1500,
            watchFor: '1s',
          })),
        });

        axiosMock.request.mockResolvedValueOnce({
          data: {
            acknowledged: true,
          },
        });

        const start = new Date();
        const result: any = await guardoni.run({
          run: 'experiment',
          experiment: experimentId as any,
        })();
        const end = new Date();

        expect(result).toMatchObject({
          _tag: 'Right',
          right: {
            message: 'Experiment completed',
            values: [
              {
                directiveType: 'search',
              },
            ],
          },
        });

        expect(differenceInMilliseconds(end, start)).toBeGreaterThan(
          (1.5 + 1) * 2 * 100
        );
      });

      test('succeed when experimentId has valid "search" directives', async () => {
        // return directive
        axiosMock.request.mockResolvedValueOnce({
          data: tests.fc.sample(SearchDirectiveArb, 2).map((d) => ({
            ...d,
            loadFor: 1000,
            watchFor: '1s',
          })),
        });

        axiosMock.request.mockResolvedValueOnce({
          data: {
            acknowledged: true,
          },
        });

        const result: any = await guardoni.run({
          run: 'experiment',
          experiment: experimentId as any,
        })();

        expect(result).toMatchObject({
          _tag: 'Right',
          right: {
            message: 'Experiment completed',
            values: [
              {
                directiveType: 'search',
              },
            ],
          },
        });
      });
    });
  });
});
