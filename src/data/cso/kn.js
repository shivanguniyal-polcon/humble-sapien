import a from './kn-a.js';
import b from './kn-b.js';
import extendKn from './extend-kn.js';

const kn = { ...a, ...b };

export default extendKn(kn);
