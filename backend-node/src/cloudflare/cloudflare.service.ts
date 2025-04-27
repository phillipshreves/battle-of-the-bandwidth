import { Injectable } from '@nestjs/common';

// We'll use dynamic import for the SpeedTestEngine
let SpeedTestEngine;

@Injectable()
export class CloudflareService {
  private speedTestEngine;
  private engineInitialized = false;

  constructor() {
    this.initSpeedTestEngine();
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
        console.log('Started speed test');
        this.speedTestEngine.restart();
        this.speedTestEngine.onFinish = results => {
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
