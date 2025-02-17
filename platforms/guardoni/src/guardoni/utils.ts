import { AppError, toAppError } from '@shared/errors/AppError';
import csvParse from 'csv-parse';
import * as csvStringify from 'csv-stringify';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as IOE from 'fp-ts/lib/IOEither';
import * as TE from 'fp-ts/lib/TaskEither';
import * as fs from 'fs';
import { guardoniLogger } from '../logger';
import { GuardoniErrorOutput, GuardoniSuccessOutput } from './types';

const utilsLogger = guardoniLogger.extend('utils');

export const CHROME_PATHS = [
  '/usr/bin/google-chrome',
  '/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Program Files/Google/Chrome/Application/chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];

// this function check for standard chrome executable path and
// return it. If not found, raise an error
export function getChromePath(): E.Either<Error, string> {
  utilsLogger.debug('Chrome possible paths %j', CHROME_PATHS);
  const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));

  utilsLogger.debug('Chrome path %s', chromePath);

  if (!chromePath) {
    return E.left(new Error("Can't find chrome path"));
  }

  return E.right(chromePath);
}

export const toGuardoniErrorOutput = (o: unknown): GuardoniErrorOutput => {
  if (o instanceof AppError) {
    return {
      type: 'error',
      message: o.message,
      details: o.details,
    };
  }

  if (o instanceof Error) {
    return {
      type: 'error',
      message: o.message,
      details: o.stack ? [o.stack] : [],
    };
  }
  return {
    type: 'error',
    message: (o as any).message ?? 'Unknown error',
    details: [`Complete error: ${JSON.stringify(o)}`],
  };
};

export const toGuardoniSuccessOutput = (
  message: string,
  values: Array<Record<string, any>>
): GuardoniSuccessOutput => {
  return {
    type: 'success',
    message,
    values,
  };
};

export const csvParseTE = (
  content: Buffer,
  options: csvParse.Options
): TE.TaskEither<
  AppError,
  {
    records: any;
    info: csvParse.Info;
  }
> =>
  TE.tryCatch(
    () =>
      new Promise((resolve, reject) => {
        csvParse(content, options, (error, records, info) => {
          if (error) {
            guardoniLogger.error('CSV Parse error: %O', error);
            return reject(error);
          }
          guardoniLogger.debug('CSV Parse results: %O', records);
          return resolve({ records, info });
        });
      }),
    toAppError
  );

export const csvStringifyTE = (
  records: any[],
  options: csvStringify.Options
): TE.TaskEither<AppError, string> =>
  TE.tryCatch(
    () =>
      new Promise((resolve, reject) => {
        csvStringify.stringify(records, options, (error, info) => {
          if (error) {
            guardoniLogger.error('CSV Stringify error: %O', error);
            return reject(error);
          }
          guardoniLogger.debug('CSV Stringify results: %O', records);
          return resolve(info);
        });
      }),
    toAppError
  );

export const liftFromIOE = <T>(lazyF: () => T): TE.TaskEither<AppError, T> => {
  return pipe(IOE.tryCatch(lazyF, toAppError), TE.fromIOEither);
};

export const getPackageVersion = (): string => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../../package.json').version;
};
