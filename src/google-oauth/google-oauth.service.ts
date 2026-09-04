import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import type { Credentials } from 'google-auth-library';

@Injectable()
export class GoogleOauthService {

  private storedTokens: any = null;

  setTokens(tokens: any) {
    this.storedTokens = tokens;
  }

  getTokens() {
    return this.storedTokens;
  }

  private oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
    });
  }

  async getTokensFromCode(code: string): Promise<Credentials> {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }
}