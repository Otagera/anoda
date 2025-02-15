const stream = require("stream");
const fs = require("fs");
const crypto = require("crypto");

const config = require("@config/index.config");

class ChatterboxSDK {
  CHATTERBOX_API_URL = config[config.env].chatterbox_api_url;
  CHATTERBOX_APP_NAME;
  CHATTERBOX_API_SECRET;
  LOG_FILE;
  RETRY_DELAY_MS;
  MAX_BULK_LOG;
  LOGGING_API_URL = "/api/logs";
  BULK_LOGGING_API_URL = "/api/logs/bulk";
  myHeaders = new Headers();

  // Load queued logs from file if it exists
  logQueue;

  /**
   * Initializes the Chatterbox Logger with the provided options.
   *
   * @constructor
   * @param {Object} _options - Configuration options for the logger.
   * @param {string} _options.appName - **(Required)** The application name.
   * @param {string} _options.apiSecret - **(Required)** The API secret for authentication.
   * @param {string} [_options.logFile] - The log file path (default: "logQueue.json").
   * @param {number} [_options.retryDelayMS] - The retry delay in milliseconds (default: 10000).
   * @param {number} [_options.maxBulkLog] - The maximum number of logs to send in bulk (default: 10).
   */
  constructor(_options) {
    this.CHATTERBOX_APP_NAME = _options?.appName;
    this.CHATTERBOX_API_SECRET = _options?.apiSecret;

    this.LOG_FILE =
      _options?.logFile ||
      config[config.env].chatterbox_log_file ||
      "logQueue.json";
    this.logQueue = fs.existsSync(this.LOG_FILE)
      ? JSON.parse(fs.readFileSync(this.LOG_FILE))
      : [];

    this.RETRY_DELAY_MS =
      _options?.retryDelayMS ||
      config[config.env].chatterbox_retry_delay ||
      10000;
    this.MAX_BULK_LOG =
      _options?.maxBulkLog || config[config.env].chatterbox_max_bulk_log || 10;

    this.myHeaders.append("Content-Type", "application/json");
    this.myHeaders.append("appName", this.CHATTERBOX_APP_NAME);
    this.myHeaders.append(
      "Authorization",
      `Bearer ${this.CHATTERBOX_API_SECRET}`
    );

    setInterval(async () => {
      if (this.logQueue.length > 0) {
        console.log(`Retrying ${this.logQueue.length} queued logs...`);

        const unsentLogs = [...this.logQueue];
        this.logQueue = []; // Clear queue for retry
        this.saveQueue();

        while (unsentLogs.length > this.MAX_BULK_LOG) {
          const nextBatchToSend = unsentLogs
            .splice(0, 10)
            .map((log) => log.data);
          const success = await this.sendLogs(nextBatchToSend);
          if (!success) {
            this.queueLogs(nextBatchToSend); // Re-queue if sending failed
          }
        }

        for (const log of unsentLogs) {
          const success = await this.sendLog(log.data);
          if (!success) {
            this.queueLog(log.data); // Re-queue if sending failed
          }
        }
      }
    }, this.RETRY_DELAY_MS);
  }

  // Save the queue back to file after each update
  saveQueue = () => {
    fs.writeFileSync(this.LOG_FILE, JSON.stringify(this.logQueue, null, 2));
  };

  // Generate a unique ID for each log entry based on its content
  generateLogId = (logData) => {
    return crypto
      .createHash("md5")
      .update(JSON.stringify(logData))
      .digest("hex");
  };

  // Function to attempt sending a log entry
  sendLog = async (logData) => {
    try {
      const response = await fetch(
        `${this.CHATTERBOX_API_URL}${this.LOGGING_API_URL}`,
        {
          method: "POST",
          headers: this.myHeaders,
          body: JSON.stringify({ log: logData }),
        }
      );

      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }

      const json = await response.json();

      console.log("Log sent successfully");
      return true; // Sent successfully
    } catch (error) {
      if (error.code === "ECONNRESET" || error.code === "ECONNREFUSED") {
        console.error("Logging server unavailable, queuing log");
      } else {
        console.error("Unexpected error sending log:", error);
      }
      return false; // Failed to send
    }
  };

  // Function to attempt sending bulk log entries
  sendLogs = async (logs) => {
    try {
      await fetch(`${this.CHATTERBOX_API_URL}${this.BULK_LOGGING_API_URL}`, {
        method: "POST",
        headers: this.myHeaders,
        body: JSON.stringify({ logs }),
      });

      console.log("Logs sent successfully");
      return true; // Sent successfully
    } catch (error) {
      if (error.code === "ECONNRESET" || error.code === "ECONNREFUSED") {
        console.error("Logging server unavailable, queuing log");
      } else {
        console.error("Unexpected error sending log:", error);
      }
      return false; // Failed to send
    }
  };

  // Add log to the queue if it's not already there
  queueLog = (logData) => {
    const logId = this.generateLogId(logData);
    const exists = this.logQueue.some((log) => log.id === logId);

    if (!exists) {
      this.logQueue.push({ id: logId, data: logData });
      this.saveQueue();
    }
  };

  // Add logs to the queue if it's not already there
  queueLogs = (logs) => {
    logs.forEach((log) => queueLog(log));
  };

  // Custom writable stream
  getCustomStream = () => {
    const self = this;
    return new stream.Writable({
      objectMode: true,
      async write(logChunk, encoding, callback) {
        const logData = JSON.parse(logChunk.toString());

        const success = await self.sendLog(logData);
        if (!success) {
          self.queueLog(logData); // Only queue if send fails
        }
        callback();
      },
    });
  };
}

module.exports = ChatterboxSDK;
