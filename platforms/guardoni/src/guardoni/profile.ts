import { AppError } from '@shared/errors/AppError';
import { format } from 'date-fns';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as TE from 'fp-ts/lib/TaskEither';
import * as fs from 'fs';
import * as Json from 'fp-ts/lib/Json';
import { failure } from 'io-ts/lib/PathReporter';
import * as path from 'path';
import { GuardoniConfig, GuardoniContext, GuardoniProfile } from './types';
import { liftFromIOE } from './utils';

export const getProfileJsonPath = (p: GuardoniProfile): string => {
  return path.join(p.udd, 'guardoni.json');
};

export const getProfileDataDir = (
  basePath: string,
  profileName: string
): string => path.join(basePath, 'profiles', profileName);

export const getDefaultProfile = (
  basePath: string,
  profileName: string
): GuardoniProfile => {
  return {
    udd: getProfileDataDir(basePath, profileName),
    newProfile: true,
    profileName,
    evidencetag: [],
    execount: 0,
  };
};

export const getExistingProfiles =
  (ctx: { logger: GuardoniContext['logger'] }) =>
  (basePath: string): string[] => {
    const profilesDir = path.resolve(basePath, 'profiles');

    ctx.logger.debug('Check profile at %s', profilesDir);

    const exists = fs.existsSync(profilesDir);

    ctx.logger.debug('Profile dir exists? %s (%s)', profilesDir, exists);

    if (!exists) {
      ctx.logger.debug('Creating dir %s', profilesDir);
      fs.mkdirSync(profilesDir, { recursive: true });
    }

    return fs.readdirSync(profilesDir);
  };

// todo: check if a profile already exists in the file system
export const checkProfile =
  (ctx: { logger: GuardoniContext['logger'] }) =>
  (
    basePath: string,
    conf: GuardoniConfig
  ): TE.TaskEither<AppError, GuardoniProfile> => {
    const profiles = getExistingProfiles(ctx)(basePath);
    // no profile given, try to retrieve the old one

    ctx.logger.debug('Profiles %O', profiles);

    const lastProfile =
      profiles !== undefined ? profiles[profiles.length - 1] : undefined;

    const profileName =
      conf.profileName ??
      lastProfile ??
      conf.evidenceTag ??
      `guardoni-${format(new Date(), 'yyyy-MM-dd')}`;

    const profileDir = getProfileDataDir(basePath, profileName);

    const profileDirExists = fs.existsSync(profileDir);
    ctx.logger.debug('Profile dir %s exists?', profileDir, profileDirExists);

    if (!profileDirExists) {
      ctx.logger.debug('Creating profile in %s', profileDir);
      fs.mkdirSync(profileDir, { recursive: true });
    }

    const profileFile = path.resolve(profileDir, 'guardoni.json');
    const profileFileExists = fs.existsSync(profileFile);
    if (!profileFileExists) {
      const profileContent = JSON.stringify(
        getDefaultProfile(basePath, profileName),
        null,
        2
      );
      ctx.logger.debug('Writing default profile %j', profileContent);
      fs.writeFileSync(profileFile, profileContent, 'utf-8');
    }

    const profile = JSON.parse(fs.readFileSync(profileFile, 'utf-8'));

    ctx.logger.debug('Returning profile %s', profileName);

    return TE.right(profile);
  };

/**
 * Read and validate the profile from file path
 */
export const readProfile =
  (ctx: { logger: GuardoniContext['logger'] }) =>
  (profilePath: string): TE.TaskEither<AppError, GuardoniProfile> => {
    ctx.logger.debug('Reading profile from %s', profilePath);

    return pipe(
      liftFromIOE(() => fs.readFileSync(profilePath, 'utf-8')),
      TE.chain((data) =>
        pipe(
          Json.parse(data),
          E.mapLeft(
            (e) =>
              new AppError(
                'ReadProfileError',
                "Can't decode the content of the profile",
                [JSON.stringify(e)]
              )
          ),
          E.chain((d) =>
            pipe(
              GuardoniProfile.decode(d),
              E.mapLeft(
                (e) =>
                  new AppError(
                    'DecodeProfileError',
                    "Can't decode guardoni profile",
                    failure(e)
                  )
              )
            )
          ),
          TE.fromEither
        )
      )
    );
  };

export const updateGuardoniProfile =
  (ctx: GuardoniContext) =>
  (
    evidenceTag: string,
    profile: GuardoniProfile
  ): TE.TaskEither<AppError, GuardoniProfile> => {
    ctx.logger.debug('Updating guardoni config %s', ctx.guardoniConfigFile);

    const execCount = profile.execount + 1;
    const updatedProfile: GuardoniProfile = {
      ...profile,
      newProfile: execCount === 0,
      execount: profile.execount + 1,
      evidencetag: profile.evidencetag.concat(evidenceTag),
    };

    ctx.logger.debug('Writing guardoni config %O', updatedProfile);
    return pipe(
      liftFromIOE(() =>
        fs.writeFileSync(
          ctx.guardoniConfigFile,
          JSON.stringify(updatedProfile, undefined, 2),
          'utf-8'
        )
      ),
      TE.map(() => {
        ctx.logger.debug(
          'profile %s wrote %j',
          ctx.guardoniConfigFile,
          updatedProfile
        );
        return updatedProfile;
      })
    );
  };
