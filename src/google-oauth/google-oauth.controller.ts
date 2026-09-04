import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';

import type { Response } from 'express';

import { GoogleOauthService } from './google-oauth.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
import { GoogleDriveService } from '../google-drive/google-drive.service';
import { CvParserService } from '../cv-parser/cv-parser.service';

@Controller('auth/google')
export class GoogleOauthController {
  constructor(
    private readonly googleOauthService: GoogleOauthService,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly googleDriveService: GoogleDriveService,
    private readonly cvParserService: CvParserService,
  ) {}

  // ============================================================
  // PROCESS ONE EVENT
  // ============================================================

  private async syncEvent(
    event: any,
    accessToken: string,
    refreshToken: string,
  ) {
    if (!event.id) {
      return { skipped: true };
    }

    const eventId = event.id;

    const candidateAttendee = event.attendees?.find(
      (a: any) => !a.organizer,
    );

    const organizerAttendee = event.attendees?.find(
      (a: any) => a.organizer,
    );

    // ============================================================
    // CREATE SHEET ROW
    // ============================================================

    const row = [
      1, // Sr. No.
      event.start?.dateTime?.split('T')[0] || '', // Date
      '', // Candidate Name
      '', // Position
      organizerAttendee?.email || '', // Interviewer
      '', // Stage
      event.start?.dateTime
        ?.split('T')[1]
        ?.substring(0, 5) || '', // Time
      event.location || '', // Location
      '', // Contact Number
      candidateAttendee?.email || '', // Email Address
      event.creator?.email || '', // Recruiter
      eventId, // Event ID
    ];

    // ============================================================
    // UPSERT ROW
    // ============================================================

    const rowNumber =
      await this.googleSheetsService.upsertRow(
        accessToken,
        refreshToken,
        eventId,
        row,
      );

    console.log(
      `ROW ${rowNumber} UPSERTED SUCCESSFULLY FOR EVENT ${eventId}`,
    );

    // ============================================================
    // FIND CV ATTACHMENT
    // ============================================================

    const cvAttachment = event.attachments?.find(
      (a: any) =>
        a.mimeType === 'application/pdf' &&
        !!a.fileId,
    );

    let cvFound = false;

    // ============================================================
    // DOWNLOAD + PARSE CV
    // ============================================================

    if (cvAttachment && cvAttachment.fileId) {
      cvFound = true;

      console.log(
        'CV ATTACHMENT FOUND:',
        JSON.stringify(cvAttachment, null, 2),
      );

      const buffer =
        await this.googleDriveService.downloadFile(
          accessToken,
          refreshToken,
          cvAttachment.fileId,
        );

      const text =
        await this.cvParserService.extractTextFromPdf(
          buffer,
        );

      const info =
        this.cvParserService.extractCandidateInfo(text);

      console.log(
        'EXTRACTED CANDIDATE INFO:',
        info,
      );

      // ============================================================
      // UPDATE CANDIDATE INFO
      // ============================================================

      if (info.name && info.phone && rowNumber) {
        await this.googleSheetsService.updateCandidateInfo(
          accessToken,
          refreshToken,
          rowNumber,
          info.name,
          info.phone,
        );

        console.log(
          'CANDIDATE INFO UPDATED IN SHEET FROM CV ATTACHMENT',
        );
      } else {
        console.log(
          'Could not extract candidate name or phone from CV',
        );
      }
    }

    return {
      eventId,
      rowNumber,
      cvFound,
    };
  }

  // ============================================================
  // GOOGLE AUTH REDIRECT
  // ============================================================

  @Get()
  redirectToGoogle(@Res() res: Response) {
    const url = this.googleOauthService.getAuthUrl();

    return res.redirect(url);
  }

  // ============================================================
  // GOOGLE OAUTH CALLBACK
  // ============================================================

  @Get('callback')
  async handleCallback(@Query('code') code: string) {
    if (!code) {
      throw new BadRequestException(
        'Authorization code is required',
      );
    }

    // ============================================================
    // GET GOOGLE TOKENS
    // ============================================================

    const tokens =
      await this.googleOauthService.getTokensFromCode(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new BadRequestException(
        'Google access token or refresh token is missing',
      );
    }

    this.googleOauthService.setTokens(tokens);

    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;

    // ============================================================
    // GET CALENDAR EVENTS
    // ============================================================

    const events =
      await this.googleCalendarService.listEvents(
        accessToken,
        refreshToken,
      );

    if (!events || events.length === 0) {
      return {
        message: 'No events found',
      };
    }

    // ============================================================
    // SYNC ALL EVENTS
    // ============================================================

    const results = [];

    for (const event of events) {
      console.log(
        'PROCESSING EVENT:',
        event.id,
      );

      // Debug: show complete attachment object
      console.log(
        'EVENT ATTACHMENTS:',
        JSON.stringify(event.attachments, null, 2),
      );

      const result = await this.syncEvent(
        event,
        accessToken,
        refreshToken,
      );

      results.push(result);
    }

    // ============================================================
    // RESPONSE
    // ============================================================

    return {
      message: 'Events synced successfully',
      results,
    };
  }
}