import { Injectable } from '@nestjs/common';

let SpeedTestEngine;

@Injectable()
export class CloudflareService {
  private speedTestEngine;
  private engineInitialized = false;
  private consoleSuppressionActive = false;
  private originalConsole = {
    error: console.error,
    warn: console.warn,
    log: console.log,
  };

  constructor() {
    this.initSpeedTestEngine();
  }

  private enableConsoleSuppression() {
    // The Cloudflare speed test library is meant to be used in the browser, but we are using it in a Node.js environment. The library logs errors to the console when it fails to fetch resources, which is expected in a Node.js environment. The test still runs and returns results, however we may be missing some logs that could be useful for debugging. If debugging via logs becomes necessary, utilize the SUPPRESS_CLOUDFLARE_LOGS environment variable to toggle log suppression on and off.

    if (this.consoleSuppressionActive) return;

    this.consoleSuppressionActive = true;

    console.error = (...args: any[]) => {
      const msg = args.join(' ');
      if (msg.includes('cloudflare.com')) {
        return;
      }
      this.originalConsole.error.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      const msg = args.join(' ');
      if (msg.includes('cloudflare.com')) {
        return;
      }
      this.originalConsole.warn.apply(console, args);
    };

    console.log = (...args: any[]) => {
      const msg = args.join(' ');
      if (msg.includes('cloudflare.com')) {
        return;
      }
      this.originalConsole.log.apply(console, args);
    };
  }

  private disableConsoleSuppression() {
    if (!this.consoleSuppressionActive) return;

    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
    console.log = this.originalConsole.log;
    this.consoleSuppressionActive = false;
  }

  private async initSpeedTestEngine() {
    try {
      const module = await import('@cloudflare/speedtest');
      SpeedTestEngine = module.default;

      this.speedTestEngine = new SpeedTestEngine({
        autoStart: false,
        measureDownloadLoadedLatency: false,
        measureUploadLoadedLatency: false,
      });
      this.engineInitialized = true;
    } catch (error) {
      console.error('Failed to initialize SpeedTestEngine:', error);
    }
  }

  async runSpeedTest() {
    if (!this.engineInitialized) {
      await this.initSpeedTestEngine();
      if (!this.engineInitialized) {
        return Promise.reject({ status: 'failed to initialize' });
      }
    }

    return new Promise((resolve, reject) => {
      if (this.speedTestEngine.isRunning) {
        reject({ status: 'running' });
      } else {
        const isSuppressionEnabled = process.env.SUPPRESS_CLOUDFLARE_LOGS === 'true';

        if (isSuppressionEnabled) {
          this.enableConsoleSuppression();
        }

        this.speedTestEngine.restart();
        this.speedTestEngine.onFinish = results => {
          if (isSuppressionEnabled) {
            this.disableConsoleSuppression();
          }

          const dBandwidth = Math.trunc(results.getDownloadBandwidth() / 1000000);
          const uBandwidth = Math.trunc(results.getUploadBandwidth() / 1000000);
          const latency = Math.trunc(results.getSummary().latency);
          resolve({
            status: 'finished',
            download: dBandwidth,
            upload: uBandwidth,
            latency: latency,
          });
        };
      }
    });
  }
}
