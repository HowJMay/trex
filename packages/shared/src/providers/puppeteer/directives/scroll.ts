import * as TE from 'fp-ts/lib/TaskEither';
import type * as puppeteer from 'puppeteer-core';
import { AppError, toAppError } from '../../../errors/AppError';
import { ScrollForDirective } from '../../../models/Directive';
import { DirectiveContext } from './types';

async function autoScroll(
  page: puppeteer.Page,
  opts: ScrollForDirective
): Promise<void> {
  await page.evaluate(
    ({ opts }) => {
      return new Promise((resolve, reject) => {
        const distance = opts.deltaY;

        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          // const scrollHeight = document.body.scrollHeight;
          // const deltaScroll = scrollHeight - window.innerHeight;

          clearInterval(timer);
          // timer = undefined;
          resolve(undefined);
        }, opts.interval ?? 100);
      });
    },
    { opts } as any
  );
}

export const GetScrollFor =
  (ctx: DirectiveContext) =>
  (
    page: puppeteer.Page,
    directive: ScrollForDirective
  ): TE.TaskEither<AppError, void> => {
    return TE.tryCatch(
      async () =>
        new Promise((resolve, reject) => {
          let i = 0;
          ctx.logger.debug('Start scrolling: %O', directive);
          const timer = setInterval(() => {
            ctx.logger.debug('Running for time %d', i);

            void autoScroll(page, directive).then(() => {
              ctx.logger.debug('Scrolled by %d', i * directive.deltaY);
            });

            if (directive.total < i * directive.deltaY) {
              clearInterval(timer);
              resolve(undefined);
            }

            i++;
          }, directive.interval ?? 300);
        }),
      toAppError
    );
  };
