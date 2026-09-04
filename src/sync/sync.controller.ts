import {
  Controller,
  Get,
  BadRequestException,
} from '@nestjs/common';

import { SyncService } from './sync.service';
import { GoogleOauthService } from '../google-oauth/google-oauth.service';

@Controller('sync')
export class SyncController {
  constructor(
    private readonly syncService: SyncService,
    private readonly googleOauthService: GoogleOauthService,
  ) {}

  @Get()
  async manualSync() {
    const tokens = this.googleOauthService.getTokens();

    if (!tokens) {
      throw new BadRequestException(
        'Google account not connected yet — visit /auth/google first',
      );
    }

    return this.syncService.syncAllEvents(
      tokens.access_token,
      tokens.refresh_token,
    );
  }
}
