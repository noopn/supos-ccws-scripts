const fse = require("fs-extra");
const path = require("path");

function getPackageRoot(packageName) {
  try {
    const modulePath = require.resolve(packageName);
    let currentDir = path.dirname(modulePath);
    while (currentDir !== "/") {
      if (
        fse.pathExistsSync(path.join(currentDir, "package.json")) &&
        require(path.join(currentDir, "package.json")).main
      ) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
  } catch {
    return null;
  }

  return null;
}
class WebpackDependencyPlugin {
  constructor(opts = {}) {
    this.opts = {
      ...opts,
    };
    this.ghostDependencies = [];
    this.extraDependencies = {};
  }
  analysisSource(source) {
    if (
      source.startsWith("!") ||
      source.startsWith(".") ||
      source.startsWith("core-js") ||
      source.startsWith("@babel")
    )
      return;

    if (
      [
        /^react$/,
        /^react-dom$/,
        /^lodash(?:\/*)/,
        /^antd$/,
        /^moment$/,
      ].some((reg) => reg.test(source))
    )
      return;

    const packageJson = require(path.resolve(process.cwd(), "package.json"));
    const { dependencies = {} } = packageJson;

    const packageRoot = getPackageRoot(source);

    if (!packageRoot) return;

    const { name } = require(path.resolve(packageRoot, "package.json"));

    if (!dependencies[name]) {
      this.ghostDependencies.push(name);
    } else {
      this.extraDependencies[name] = dependencies[name];
    }
  }
  apply(compiler) {
    console.log(compiler.options);
    const { path: outputPath } = compiler.options.output;

    compiler.hooks.normalModuleFactory.tap(
      "webpack-dependency-plugin",
      (factory) => {
        factory.hooks.parser
          .for("javascript/auto")
          .tap("webpack-dependency-plugin", (parser, options) => {
            parser.hooks.import.tap(
              "webpack-dependency-plugin",
              (statement, source) => {
                this.analysisSource(source);
              }
            );

            parser.hooks.importCall.tap(
              "webpack-dependency-plugin",
              (statement) => {
                const source = statement.source.value;
                this.analysisSource(source);
              }
            );
          });
      }
    );
    // compiler.hooks.compilation.tap(
    //   "webpack-dependency-plugin",
    //   (compilation) => {
    //     compilation.hooks.finishModules.tap("webpack-dependency-plugin", () => {
    //       if (this.ghostDependencies.length > 0) {
    //         compilation.warnings.push(
    //           `You have these ghost dependencies [${this.ghostDependencies.join(
    //             ","
    //           )}], haven't installed in your project dependencies. Please check install or remove from the source code.`
    //         );
    //       }
    //     });
    //   }
    // );

    compiler.hooks.done.tap("webpack-dependency-plugin", () => {
      fse.writeFileSync(
        path.resolve(outputPath, "dependencies.json"),
        JSON.stringify(this.extraDependencies, null, 2)
      );
    });
  }
}

module.exports = WebpackDependencyPlugin;
