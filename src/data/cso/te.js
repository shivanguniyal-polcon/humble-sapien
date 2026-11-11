import a from './te-a.js';
import b from './te-b.js';
import extendTe from './extend-te.js';

const te = { ...a, ...b };

export default extendTe(te);
