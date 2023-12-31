import express from 'express';
import path from 'node:path';
import helmet from 'helmet';

import clientRouter from '_/net/clientRouter';
import apiRouter from '_/net/apiRouter';
import { expressLog, consoleColors } from '_/util';
import { Server } from 'http';

const port = process.env.PORT || 8080;
const environment = process.env.NODE_ENV || 'development';
const rootDir = process.env.ROOT_DIR;
const suppressSanity = process.env.SUPPRESS_SANITY;
const publicPath = path.join(
  rootDir || path.resolve('./dist'),
  'client',
  'public'
);
const distPath = path.join(rootDir || path.resolve('./dist'), 'client');

export let internalHttpServer: Server;

export function server() {
  const app = express();
  app.enable('trust proxy');

  if (environment === 'production') app.use(helmet());

  internalHttpServer = app.listen(port, () => {
    expressLog(`Currently running in ${environment} mode`);

    if (environment === 'production') {
      //Production warnings
      if (!suppressSanity)
        console.info(
          `${consoleColors.yellow}[ SECURITY WARN ]${consoleColors.reset} You're running in production mode, assuming a typical workflow, you should run this behind a reverse proxy to set-up https. If you have done this and this warning annoys you, you may suppress the error by setting the SUPPRESS_SANITY environment variable to 'true'.`
        );

      if (rootDir == null)
        console.error(
          `${consoleColors.red}[ SECURITY RISK ]${consoleColors.reset} You're running in production mode, but don't have a web root path set, use the ROOT_DIR environment variable to set it. In some cases having this variable unset may lead to undesired results.`
        );
      else
        expressLog(
          `Root dir set to '${rootDir}'. Assets will be served from here rather than the current working directory...`
        );
    }

    expressLog(`Server live & listening @ http://localhost:${port}`);
  });

  if (environment === 'production') {
    app.use('/', express.static(distPath));
  } else {
    app.use('/', express.static(publicPath));

    app.use('/src', (req, res) => {
      expressLog(
        `redirecting asset '${req.path}' to localhost:5173/src${req.path}`
      );
      res.redirect(303, `http://localhost:5173/src${req.path}`);
    });
  }

  app.use(apiRouter(internalHttpServer));
  app.use(clientRouter());
}
