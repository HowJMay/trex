import home from './home';
import { processLeaf } from './leaf';
import searches from './searches';
import * as shared from './shared';
import thumbnail from './thumbnail';
import video from './video';
// import uxlang from './uxlang';

/**
 * export all parsers as dictionary
 */

export const parsers = {
  home,
  searches,
  shared: shared.getThumbNailHref,
  thumbnail,
  video,
  search: searches,
};

export const leafParsers = {
  home: processLeaf,
  search: processLeaf,
  video: processLeaf,
};
