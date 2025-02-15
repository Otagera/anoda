const { randomUUID } = require("node:crypto");
const { pino, multistream } = require("pino");
const { pinoHttp } = require("pino-http");
const pinoPretty = require("pino-pretty");
const { gray, green, isColorSupported, red, yellow } = require("colorette");
const { DateTime } = require("luxon");
const config = require("@config/index.config");

const ChatterboxSDK = require("./chatterbox.util");

const chatterbox = new ChatterboxSDK({
  apiSecret: config.development.chatterbox_api_secret,
  appName: config.development.chatterbox_app_name,
});

class PinoLogger {
  httpLoggerInstance;
  _config;

  constructor(_config) {
    this._config = _config;
    const pinoLogger = pino(this._getPinoOptions(), this._getLogDestination());
    this.httpLoggerInstance = pinoHttp(this._getPinoHttpOptions(pinoLogger));
  }

  log(message) {
    // console.log('🌶️', message);
    // console.log('🎁', green(message));
    this.trace({ message: green(message), context: "log" });
  }
  info(data, key) {
    this.httpLoggerInstance.logger.info({ data }, green(key));
  }
  warn(data, key) {
    this.httpLoggerInstance.logger.warn({ data }, yellow(key));
  }
  trace(data, key) {
    // console.log('🍅--> ', obj, key, '**', context);
    this.httpLoggerInstance.logger.trace({ data }, gray(key));
  }
  fatal(error, message, context) {
    this.httpLoggerInstance.logger.fatal(
      {
        context: [context, this._config.appName].find(Boolean),
        type: error.name,
        formatedTimestamp: `${this._getDateFormat()}`,
        application: this._config.appName,
        stack: error.stack,
      },
      red(message)
    );
  }
  error(context, key) {
    this.httpLoggerInstance.logger.error({ context }, key);
  }

  _getDateFormat(date = new Date(), format = "dd-MM-yyyy HH:mm:ss") {
    return DateTime.fromJSDate(date).setZone("system").toFormat(format);
  }
  _getPinoOptions() {
    return {
      name: this._config.appName,
      level: this._config.level,
      formatters: {
        level(label) {
          return { level: label };
        },
      },
      base: undefined,
      messageKey: this._config.messageKey,
      errorKey: "error",
    };
  }

  _getPinoConfig() {
    return {
      colorize: isColorSupported,
      levelFirst: true,
      ignore: "pid,hostname",
      quietReqLogger: true,
      messageFormat: (log, messageKey) => {
        const message = log[String(messageKey)];
        if (this._config.appName) {
          return `[${this._config.appName}] ${message}`;
        }

        return message;
      },
      customPrettifiers: {
        time: () => {
          return `[${this._getDateFormat()}]`;
        },
      },
    };
  }

  _getLogDestination() {
    // const streams = [chatterbox.getCustomStream()];
    const streams = [];

    if (this._config.enableConsoleLogs) {
      streams.push({
        level: "trace",
        stream: pinoPretty({
          colorize: true,
          colorizeObjects: true,
          messageKey: this._config.messageKey,
          ignore: "pid,hostname,name",
          singleLine: config.env === "development",
          translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
          messageFormat: (log, messageKey) => {
            const message = log[String(messageKey)];

            return `[${this._config.appName}] ${message}`;
          },
        }),
      });
    }

    return multistream(streams);
  }

  _getPinoHttpOptions(logger) {
    return {
      logger,
      quietReqLogger: true,
      genReqId: function () {
        return randomUUID();
      },
      customAttributeKeys: {
        req: "request",
        res: "response",
        err: "error",
        responseTime: "timeTaken",
        reqId: "traceId",
      },
      customReceivedMessage: (req) => {
        return `REQUEST-INITIATED-${req.id}`;
      },
      customSuccessMessage: (req) => {
        return `REQUEST-COMPLETE-${req.id}`;
      },
      customErrorMessage: (req) => {
        return `REQUEST-FAILED-${req.id}`;
      },
      customReceivedObject: (req) => {
        return {
          request: {
            id: req.id,
            method: req.method,
            url: req.url,
            query: req.query,
            params: req.params,
            body: req.body,
          },
        };
      },
      serializers: {
        err: () => false,
        req: (req) => {
          return config.env === "development"
            ? `${req.method} ${req.url}`
            : req;
        },
        res: (res) =>
          config.env === "development"
            ? `${res.statusCode} ${res.headers["content-type"]}`
            : res,
      },
      // customProps: (req) => {
      //   const bindings = {
      //     traceId: req.id,
      //     application: this._config.appName,
      //     path: `${req.protocol}://${req.headers.host}${req.url}`,
      //   };

      //   this.httpLoggerInstance.logger.setBindings(bindings);

      //   return bindings;
      // },
      customLogLevel: (req, res) => {
        if (res.statusCode >= 400) {
          return "error";
        }

        if (res.statusCode >= 300 && res.statusCode < 400) {
          return "silent";
        }

        return "info";
      },
      redact: {
        censor: "********",
        paths: [
          "request.body.password",
          "response.headers",
          "request.headers",
          "request.remoteAddress",
          "request.remotePort",
        ],
      },
    };
  }
}

const defaultLogger = new PinoLogger({
  appName: config.app_name,
  level: "debug",
  messageKey: "key",
  dbURI: config[config.env].db_url,
  enableConsoleLogs: config.env === "development",
  enableConsoleLogs: true,
});

module.exports = defaultLogger;
