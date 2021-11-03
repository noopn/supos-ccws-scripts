const context = new Map();
const get = (key) => context.get(key);

const set = (key,value) => context.set(key,value);

module.exports = {
    get,
    set
};