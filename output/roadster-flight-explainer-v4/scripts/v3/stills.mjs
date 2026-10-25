// Same artistic V3 composition and exact frame numbers as the full film.
import {main} from './finalize.mjs';
main({stillsOnly: true}).catch((e) => {console.error(e.stack); process.exitCode = 1;});
