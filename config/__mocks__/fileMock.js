module.exports = {
  process(sourceText, sourcePath, options) {
    return {
      code: `module.exports = "some_path"`,
    };
  },
};
