// Stdout channel: print a colored summary to the terminal. Always safe.

import { renderTerminal } from '../render.js';

export function deliver(digest, config, channelCfg, ctx) {
  const color = channelCfg.color !== false && !process.env.NO_COLOR;
  process.stdout.write(renderTerminal(digest, config, { now: ctx.now, color }));
  return { wrote: true };
}
