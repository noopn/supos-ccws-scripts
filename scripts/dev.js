const http = require("node:http");
const path = require("node:path");

const chalk = require("chalk");
const webpack = require("webpack");
const fse = require("fs-extra");
const inquirer = require("inquirer");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WebpackDevServer = require("webpack-dev-server");
const { merge } = require("webpack-merge");
const Koa = require("koa");
const Router = require("koa-router");
const koaStatic = require("koa-static");
const render = require("koa-art-template");
const glob = require("glob");
const open = require("open");
const ora = require("ora");
const portscanner = require("portscanner");
const chokidar = require("chokidar");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");

const { analysisWorkFolder, getDefinedConfig } = require("../utils/common");
const baseConfig = require("../config/webpack.config");
const configPath = path.resolve(process.cwd(), "ccws.config.json");

const spinner = ora();

const router = new Router();
const app = new Koa();
const server = http.Server(app.callback());

const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
});

const mode = "development";
const basePath = path.join(process.cwd(), "./src");
const appsPath = glob.sync(path.resolve(basePath, "*"));

const publicPath = path.resolve(__dirname, "../public");

const isNoTrack = !fse.pathExistsSync(
  path.resolve(process.cwd(), "./.cache/ccws.lock")
);


render(app, {
  root: publicPath,
  extname: ".art",
  debug: false,
  compileDebug: false,
});

const { compareDependencies } = require("../utils/common");
const { initService, fetchPersonInfo } = require("../utils/service");

if (!fse.pathExistsSync(configPath)) {
  spinner.fail("can't find ccws.config.json in you project root");
  process.exit(1);
}

const diffDeps = compareDependencies();

if (diffDeps.length) {
  console.log();

  spinner.fail(
    "Please don't install the following packages, because these packages is supOS dependencies, \n  This may cause unexpected errors, you need to restore these dependencies to the following specified versions, \n  and Use strictly in accordance with the specified version of the documentation"
  );
  console.log();
  diffDeps.forEach(([depName, localVer, depVer]) =>
    console.log(
      `  ${depName}@${localVer} shouldn't install, ${depName}@${depVer} have been installed by CLI.`
    )
  );
  console.log();
  process.exit(0);
}

if (!appsPath.length) {
  spinner.fail("You don't have any App");
  process.exit(0);
}

let port = 9348;
const host = "127.0.0.1";

let componentsMap = new Map();
let serversMap = new Map();
let appList = [];

router.get("/", async (ctx) => {
  await ctx.render("index", { appList });
});

router.get("/:id", async (ctx) => {
  const { id } = ctx.params;
  const componentInfo = componentsMap.get(id);
  if (componentInfo) {
    ctx.stats = 200;
    ctx.body = true;

    if (serversMap.has(componentInfo.id)) return;
    const instance = await start({ ...componentInfo });
    serversMap.set(componentInfo.id, instance);
  } else {
    await ctx.render("404");
  }
});

app.use(koaStatic(publicPath, { index: null }));
app.use(router.routes());
app.use(router.allowedMethods());

app.on("error", function(err) {
  console.log(err.stack);
});

io.on("connection", (socket) => {
  let devWsId;
  socket.on("message", (id) => {
    devWsId = id;
    serversMap.has(id) && clearTimeout(serversMap.get(id).__timer);
  });
  socket.on("disconnect", () => {
    if (!serversMap.has(devWsId)) return;
    serversMap.get(devWsId).__timer = setTimeout(async () => {
      const instance = serversMap.get(devWsId);
      const { port } = instance.server.address();
      await instance.stop();
      serversMap.delete(devWsId);
      spinner.info(`webpack dev server on port ${port}, has already stopped. `);
    }, 1000 * 20);
  });
});

const watcher = chokidar.watch(basePath, {
  persistent: true,
  ignoreInitial: true,
  ignored: /[\/\\]\./,
  usePolling: true,
});

// 添加事件监听器
const add = (path) => {
  spinner.info(`File ${path} has been added`);
  io.of("/").emit("workspaceChange", { path, type: "add" });
};

watcher.on("add", add);
// watcher.on("ready", async () => {
//   ({ appList, componentsMap } = await analysisWorkFolder());
// });
// .on('change', path => console.log(`File ${path} has been changed`))
// .on('unlink', path => console.log(`File ${path} has been removed`))
// .on('addDir', path => console.log(`Directory ${path} has been added`))
// .on('unlinkDir', path => console.log(`Directory ${path} has been removed`))
// .on('error', error => spinner.wee);

// appsPath.forEach((appPath) => {
//   fse.watch(appPath, (err) => {
//     io.of("/").emit("workFolderChange", { path: appPath });
//   });
// });

Promise.resolve()
  .then(
    async () =>
      ({ appList, componentsMap } = await analysisWorkFolder(isNoTrack))
  )
  .then(() => {
    return new Promise((resolve, reject) => {
      portscanner.checkPortStatus(port, host, (error, status) => {
        if (status === "open") return reject(port);
        return resolve(port);
      });
    })
      .catch((port) => {
        spinner.fail(`Port ${port} is already in use.`);
        return new Promise((resolve, reject) => {
          portscanner.findAPortNotInUse(
            port,
            10000 + port,
            host,
            (error, port) => {
              if (error) {
                spinner.fail(error);
                process.exit(1);
              }
              return resolve(port);
            }
          );
        }).then((newPort) => {
          return inquirer
            .prompt([
              {
                type: "confirm",
                name: "start",
                message: `Do you want to start dev server at port ${chalk.cyan(
                  newPort
                )}`,
              },
            ])
            .then((answer) => {
              if (!answer.start) process.exit(1);
              return newPort;
            });
        });
      })

      .then((newPort) => {
        port = newPort;
        server.listen(newPort, () => {
          console.log();
          spinner.succeed(
            `server listening on ${chalk.underline.cyan(
              `http://${host}:${newPort}`
            )}`
          );
          open(`http://${host}:${newPort}`);
        });
      });
  });

async function start(componentInfo) {
  const { componentName, componentOutputPath, componentPath } = componentInfo;

  const plugins = [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "../public/template.html"),
      filename: "index.html",
      title: componentName,
    }),

    new webpack.ProvidePlugin({
      _: "lodash",
      scriptUtil: path.resolve(__dirname, "../config/scriptUtil.js"),
    }),
    new webpack.DefinePlugin({
      COMPONENT_ENTRY: `"${componentInfo.componentEntryPath}"`,
    }),
    new ReactRefreshWebpackPlugin(),
  ];
  const defineConfig = await getDefinedConfig(componentPath);

  if (defineConfig) {
    plugins.push(new webpack.DefinePlugin(defineConfig));
  }
  let webpackConfig = merge(baseConfig(mode), {
    entry: path.resolve(__dirname, "../config/runtimeIndex.jsx"),
    devtool: "eval-source-map",
    mode: "development",
    plugins,
  });

  let webpackOverwrite;
  try {
    webpackOverwrite = require(path.join(
      componentPath,
      "webpack.overwrite.js"
    ));
  } catch {}

  if (webpackOverwrite && typeof webpackOverwrite === "function") {
    webpackConfig = webpackOverwrite(webpackConfig) || webpackConfig;
  }

  const compiler = webpack(webpackConfig);

  const serverConfig = {
    static: {
      directory: path.join(__dirname, "../public"),
      publicPath: "/_dev_assets_",
    },
    compress: true,
    hot: true,
    open: true,
    setupMiddlewares: genMiddlewares(componentInfo),
  };

  if (!isNoTrack) {
    serverConfig.proxy = {
      "/": {
        target: componentInfo.origin,
        secure: false,
        changeOrigin: true,
        bypass: function(req) {
          if (req.url.startsWith("/_dev_assets_")) {
            return req.url;
          }
        },
      },
    };
  }

  const server = new WebpackDevServer(serverConfig, compiler);

  await server.start();
  return server;
}

function genMiddlewares(componentInfo) {
  return (middlewares, devServer) => {
    middlewares.unshift({
      name: "inject user info",
      middleware: (req, res, next) => {
        const send = res.send;
        res.send = async function(body) {
          let content = body;
          if (Buffer.isBuffer(content)) {
            content = content.toString();
          }
          if (
            req.url === "/" &&
            /<script type="suposInfo"><\/script>/.test(content)
          ) {
            let replaceContent = "<script>";
            if (!isNoTrack) {
              const logMsg = await initService({ ...componentInfo, spinner });
              const personInfo = await fetchPersonInfo();
              replaceContent += `
              window.localStorage.setItem('loginMsg','${JSON.stringify(
                logMsg
              )}')
              window.localStorage.setItem('ticket','${logMsg.ticket}');
              window.localStorage.setItem('personInfo','${JSON.stringify(
                personInfo.userInfo
              )}')`;
            }

            replaceContent += `
            window.localStorage.setItem('__koa_server_port__','${port}');
            window.localStorage.setItem('__dev_ws_id__','${componentInfo.id}');`;

            replaceContent += `</script>`;
            content = content.replace(
              /<script type="suposInfo"><\/script>/,
              replaceContent
            );
            send.call(this, Buffer.from(content, "utf-8"));
            spinner.succeed("reload component success");
          } else {
            send.call(this, body);
          }
        };

        next();
      },
    });

    return middlewares;
  };
}

process.on("uncaughtException", (err) => {
  throw err;
});
