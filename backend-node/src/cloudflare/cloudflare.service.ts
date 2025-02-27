import { Injectable } from '@nestjs/common';
import SpeedTestEngine from '@cloudflare/speedtest';

@Injectable()
export class CloudflareService {
  speedTestEngine = new SpeedTestEngine({
    autoStart: false,
    measureDownloadLoadedLatency: false,
    measureUploadLoadedLatency: false,
  });

  async runSpeedTest() {
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
