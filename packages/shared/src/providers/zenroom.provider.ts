import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as TE from 'fp-ts/lib/TaskEither';
import { zencode_exec } from 'zenroom';
import { Keypair } from '../models/extension/Keypair';
import { trexLogger } from '../logger';
import { SecurityProvider } from './security.provider.type';

const conf = 'memmanager=lw';

const zrLogger = trexLogger.extend('zenroom');

export const makeKeypair = (knownAs: string): TE.TaskEither<Error, Keypair> => {
  const contract = `Scenario 'ecdh': Create the keypair
    Given that I am known as '${knownAs}'
    When I create the keypair
    Then print my data`;
  return pipe(
    TE.tryCatch(() => zencode_exec(contract, { conf }), E.toError),
    TE.map((r) => {
      zrLogger.debug(`zencode result %O`, r);
      return r.result as any;
    })
  );
};

const makeToken = (
  date: Date,
  secretKey: string
): TE.TaskEither<Error, string> => {
  const keys = JSON.stringify({ secretKey });
  const data = JSON.stringify({ date });
  const contract = `Scenario 'ecdh': Encrypt a message with a password/secret
      Given that I have a 'string' named 'password'
      and that I have a 'string' named 'message'
      When I encrypt the secret message 'message' with 'password'
      Then print the 'secret message'`;

  return pipe(
    TE.tryCatch(() => zencode_exec(contract, { data, keys, conf }), E.toError),
    TE.map((r) => {
      zrLogger.debug(`Make token result: %O`, r);
      return r.result;
    })
  );
};

export const security: SecurityProvider = {
  makeKeypair,
  makeToken,
  makeSignature: () =>
    TE.left(new Error('Method "makeSignature" not implemented')),
  verifySignature: () => TE.right(false),
};
