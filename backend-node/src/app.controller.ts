import { AppService } from './app.service';
import {
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from './security/is-public/is-public.decorator';
import { ThrottlerBehindProxyGuard } from './security/throttler-behind-proxy/throttler-behind-proxy.guard';
import { Response } from 'express';
import { LocalAuthGuard } from './security/guard/local-auth.guard';
import { LoginDto } from './user/dto/login.dto';
import { TokenService } from './token/token.service';
import { LoggerService } from './logger/logger.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private tokenService: TokenService,
    private loggerService: LoggerService,
  ) {}

  //health check
  @ApiTags('health check')
  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerBehindProxyGuard)
  @Get('health-check')
  async healthCheck() {
    return {
      message: 'Service is up and running',
      status: 'Healthy',
    };
  }

  @ApiTags('health check')
  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerBehindProxyGuard)
  @Get('health-check-filemaker')
  async healthCheckFileMaker() {
    const result = await this.appService.healthCheckFileMaker();
    if (result.error.code === 0) {
      return result.data;
    }
    if (result.error.code > 99) {
      throw new HttpException(result.error.message, result.error.code);
    }
    throw new HttpException(
      'Internal Server Error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  //login
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: `Login successful, access token in response body, refresh token in response cookie refreshToken`,
    schema: {
      type: 'object',
      example: {
        access_token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0Mzk5MzU5MzQ3MjM0NjIzMTUxNzEzMjEwMDc4ODAyMjk0NDAwMjc4MDk1NDg3MTU2MDE4OTE4NDEzIiwiaWF0IjoxNjg0MzM4MDU1LCJleHAiOjE2ODQzMzk4NTV9.V2yzOmJ_y9S0seQAcH-No2INnBgLSrSpjKzAmp0Qhh8',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    schema: {
      type: 'object',
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiTags('token')
  @Public()
  @UseGuards(ThrottlerBehindProxyGuard, LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Request() req, @Res({ passthrough: true }) response: Response) {
    this.loggerService.logger.debug('login request', req);
    this.loggerService.logger.debug('login response contains sensitive data');
    this.loggerService.logger.info(
      'A Post request has been made to the login endpoint',
    );

    const result = await this.tokenService.login(req.user);
    const tokens = result.data.tokens;
    const expiresOn = new Date(result.data.expiresOn * 1000);

    if (result.error.code === 0) {
      response.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        expires: expiresOn,
      });
      response.cookie('access_token', tokens.accessToken, {});
      return { access_token: tokens.accessToken };
    }
    if (result.error.code > 99) {
      throw new HttpException(result.error.message, result.error.code);
    }
    throw new HttpException(
      'Internal Server Error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  //logout
  @ApiResponse({
    status: 200,
    description: `User has been logged out`,
    schema: {
      type: 'object',
      example: {
        id: '866554159496749091738140499285170285702178304783747707821',
      },
    },
  })
  @ApiBearerAuth()
  @ApiTags('token')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerBehindProxyGuard)
  @Get('logout')
  async logout(@Request() req, @Res({ passthrough: true }) response: Response) {
    this.loggerService.logger.debug('logout request', { req, response });
    this.loggerService.logger.info(
      'A request has been made to the logout endpoint',
    );

    const refreshToken = req.cookies['refreshToken'];
    response.clearCookie('refreshToken');
    response.clearCookie('access_token');
    const result = await this.tokenService.logout(refreshToken);
    if (result.error.code === 0) {
      return result.data;
    }
    if (result.error.code > 99) {
      throw new HttpException(result.error.message, result.error.code);
    }
    throw new HttpException(
      'Internal Server Error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
  //refresh token
  @ApiResponse({
    status: 200,
    description: `token`,
  })
  @ApiTags('token')
  @Public()
  @UseGuards(ThrottlerBehindProxyGuard)
  @HttpCode(HttpStatus.OK)
  @Get('refresh-access-token')
  async refresh(
    @Request() req,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshCookie = req.cookies['refreshToken'];
    this.loggerService.logger.debug('refresh token request', { req, response });
    this.loggerService.logger.info(
      `refresh used at controller level ${refreshCookie}`,
    );
    if (refreshCookie != undefined) {
      const tokens = await this.tokenService.refreshTokens(
        req.cookies['refreshToken'],
      );
      const result = tokens;
      //expiry date in a week
      const expiryDate = new Date(Date.now() + 604800000);

      if (result.error.code === 0) {
        response.cookie('refreshToken', tokens.data.refreshToken, {
          httpOnly: true,
          expires: expiryDate,
        });
        response.cookie('access_token', tokens.data.accessToken, {});
        return { access_token: tokens.data.accessToken };
      }
      if (result.error.code > 99) {
        throw new HttpException(result.error.message, result.error.code);
      }
    }

    throw new HttpException(
      'Internal Server Error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
