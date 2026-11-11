import a from './ur-a.js';
import b from './ur-b.js';
import extendUr from './extend-ur.js';

const ur = { ...a, ...b };

export default extendUr(ur);
