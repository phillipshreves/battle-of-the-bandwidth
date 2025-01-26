import { Injectable } from '@nestjs/common';
import { FilemakerService } from './filemaker/filemaker.service';
import {
  ErrorHandlingService,
  GenericResult,
} from './error-handling/error-handling.service';
import { FilemakerOdataCall } from './filemaker/entities/filemaker-odata-call.entity';
import { RedisHelperService } from '@app/redis-helper';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(
    private fmService: FilemakerService,
    private errorHandlingService: ErrorHandlingService,
    private redisHelperService: RedisHelperService,
    private configService: ConfigService,
  ) {}

  testEnv = this.configService.get('testEnvironment');

  async healthCheckFileMaker(noCache?: boolean): Promise<GenericResult<any>> {
    const result = this.errorHandlingService.createResult();
    const redisCluster = await this.redisHelperService.getClusterConnection();

    const rKey = `healthcheck:filemaker:${
      this.testEnv ? 'test' : 'production'
    }`;
    if (noCache == undefined) {
      noCache = false;
    }

    if (!noCache) {
      const cachedData = await this.redisHelperService.getWithRefreshCheck(
        rKey,
      );
      if (cachedData != null) {
        if (cachedData.needRefresh) {
          this.healthCheckFileMaker(true);
        }
        result.data = cachedData.data.data;
        result.error = cachedData.data.error;
        return result;
      }
    }

    redisCluster.set(`${rKey}:refreshing`, 'true', {
      EX: 30,
    });

    let fmOdataCall: FilemakerOdataCall = {
      database: 'authenticator',
      scriptRoute: 'utilityHealthCheckAuthenticator',
      requestData: {
        scriptParameterValue: {},
      },
      method: 'get',
    };

    let scriptResult = await this.fmService.databaseCallHandling(fmOdataCall);
    if (scriptResult.error.code != 0) {
      const stackError = this.errorHandlingService.stackError({
        code: scriptResult.error.code,
        message: `${scriptResult.error.message}`,
        data: scriptResult.data,
      });
      result.error = stackError;

      this.redisHelperService.setWithRefreshKeys(
        rKey,
        JSON.stringify(result),
        60 * 60,
        60,
      );
      return result;
    }
    if (scriptResult.data.status != 'Healthy') {
      result.error.code = 500;
      result.error.message = `Authenticator database inaccessible. ${result.error.message}`;
    } else {
      result.data = scriptResult.data;
    }

    fmOdataCall = {
      database: 'travelmanager',
      scriptRoute: 'utilityHealthCheckTravelManager',
      requestData: {
        scriptParameterValue: {},
      },
      method: 'get',
    };

    scriptResult = await this.fmService.databaseCallHandling(fmOdataCall);
    if (scriptResult.error.code != 0) {
      const stackError = this.errorHandlingService.stackError({
        code: scriptResult.error.code,
        message: `${scriptResult.error.message}`,
        data: scriptResult.data,
      });
      result.error = stackError;

      this.redisHelperService.setWithRefreshKeys(
        rKey,
        JSON.stringify(result),
        60 * 60,
        60,
      );
      return result;
    }
    if (scriptResult.data.status != 'Healthy') {
      result.error.code = 500;
      result.error.message = `TravelManager database inaccessible. ${result.error.message}`;
    } else {
      result.data = scriptResult.data;
    }

    this.redisHelperService.setWithRefreshKeys(
      rKey,
      JSON.stringify(result),
      60 * 60,
      60,
    );
    return result;
  }
}
