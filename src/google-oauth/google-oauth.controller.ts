import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';

import type { Response } from 'express';

import { GoogleOauthService } from './google-oauth.service';
import { SyncService } from '../sync/sync.service';

@Controller('auth/google')
export class GoogleOauthController {
  constructor(
    private readonly googleOauthService: GoogleOauthService,
    private readonly syncService: SyncService,
  ) {}

  @Get()
  redirectToGoogle(@Res() res: Response) {
    const url = this.googleOauthService.getAuthUrl();

    return res.redirect(url);
  }

  @Get('callback')
  async handleCallback(@Query('code') code: string) {
    if (!code) {
      throw new BadRequestException(
        'Authorization code is required',
      );
    }

    const tokens =
      await this.googleOauthService.getTokensFromCode(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new BadRequestException(
        'Google access token or refresh token is missing',
      );
    }

    this.googleOauthService.setTokens(tokens);

    const result = await this.syncService.syncAllEvents(
      tokens.access_token,
      tokens.refresh_token,
    );

    return { message: 'Connected and synced!', results: result.results };
  }
}