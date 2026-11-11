import a from './ml-a.js';
import b from './ml-b.js';
import extendMl from './extend-ml.js';

const ml = { ...a, ...b };

export default extendMl(ml);
