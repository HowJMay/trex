import nacl from 'tweetnacl';
import bs58 from 'bs58';

import config from '../config';
import UserSettings from '../models/UserSettings';
import { decodeString, decodeFromBase58 } from '../../utils/decode.utils';
import db from './db';

const post =
  (path: string) =>
  (data: Record<string, unknown>, cookieId: string): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      db.getValid(UserSettings)('local')
        .then((settings) => {
          const xhr = new XMLHttpRequest();
          const payload = JSON.stringify({
            ...data,
            researchTag: settings.researchTag,
          });
          const url = `${config.API_ROOT}/${path}`;

          xhr.open('POST', url, true);

          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.setRequestHeader('X-tktrex-Version', config.VERSION);
          xhr.setRequestHeader('X-tktrex-Build', config.BUILD);

          const signature = nacl.sign.detached(
            decodeString(payload),
            decodeFromBase58(settings.secretKey)
          );

          xhr.setRequestHeader('X-tktrex-NonAuthCookieId', cookieId);
          xhr.setRequestHeader('X-tktrex-PublicKey', settings.publicKey);
          xhr.setRequestHeader('X-tktrex-Signature', bs58.encode(signature));

          xhr.send(payload);
          xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
              try {
                resolve(JSON.parse(this.response));
              } catch (e) {
                reject(new Error('Invalid JSON received from API'));
              }
            } else {
              reject(this.statusText);
            }
          };

          xhr.onerror = function () {
            reject(this.statusText);
          };
        })
        .catch(reject);
    });
  };

const api = {
  postEvents: post('events'),
  postAPIEvents: post('apiEvents'),
  validate: post('validate'),
  handshake: post('handshake'),
};

export default api;
