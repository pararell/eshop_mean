process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import 'zone.js/node';
import './server/src/main-ssr';
export * from './client/src/main.server';
