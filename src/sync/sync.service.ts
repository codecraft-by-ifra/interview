import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { GoogleOauthService } from '../google-oauth/google-oauth.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
import { GoogleDriveService } from '../google-drive/google-drive.service';
import { CvParserService } from '../cv-parser/cv-parser.service';

@Injectable()
export class SyncService {
  constructor(
    private readonly googleOauthService: GoogleOauthService,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly googleDriveService: GoogleDriveService,
    private readonly cvParserService: CvParserService,
  ) {}

  // Extracts 'Position: XYZ' or 'Job: XYZ' or 'Role: XYZ'
  // from the event description
  private extractPosition(
    description: string | undefined | null,
  ): string {
    if (!description) return '';

    const match = description.match(
      /(?:position|job|role)\s*[:\-]\s*(.+)/i,
    );

    return match ? match[1].trim() : '';
  }

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

    const position = this.extractPosition(event.description);

    const row = [
      1, // Sr. No. (auto-calculated inside appendRow)
      event.start?.dateTime?.split('T')[0] || '',
      '', // Candidate Name
      position, // Position — pulled from description
      organizerAttendee?.email || '',
      '', // Stage
      event.start?.dateTime?.split('T')[1]?.substring(0, 5) || '',
      event.location || '',
      '', // Contact Number
      candidateAttendee?.email || '',
      event.creator?.email || '',
      eventId,
    ];

    const rowNumber =
      await this.googleSheetsService.upsertRow(
        accessToken,
        refreshToken,
        eventId,
        row,
      );

    console.log(
      `ROW ${rowNumber} UPSERTED FOR EVENT ${eventId}`,
    );

    const cvAttachment = event.attachments?.find(
      (a: any) =>
        a.mimeType === 'application/pdf' &&
        !!a.fileId,
    );

    let cvFound = false;

    if (cvAttachment && cvAttachment.fileId) {
      cvFound = true;

      const buffer =
        await this.googleDriveService.downloadFile(
          accessToken,
          refreshToken,
          cvAttachment.fileId,
        );

      const text =
        await this.cvParserService.extractTextFromPdf(buffer);

      const info =
        this.cvParserService.extractCandidateInfo(text);

      if (info.name && info.phone && rowNumber) {
        await this.googleSheetsService.updateCandidateInfo(
          accessToken,
          refreshToken,
          rowNumber,
          info.name,
          info.phone,
        );
      }
    }

    return {
      eventId,
      rowNumber,
      cvFound,
      position,
    };
  }

  // Called by:
  // 1. Initial OAuth callback
  // 2. Manual /sync endpoint
  // 3. Automatic cron job
  async syncAllEvents(
    accessToken: string,
    refreshToken: string,
  ) {
    const events =
      await this.googleCalendarService.listEvents(
        accessToken,
        refreshToken,
      );

    if (!events || events.length === 0) {
      return {
        message: 'No events found',
        results: [],
      };
    }

    const results = [];

    for (const event of events) {
      const result = await this.syncEvent(
        event,
        accessToken,
        refreshToken,
      );

      results.push(result);
    }

    return {
      message: 'Synced successfully',
      results,
    };
  }

  // Runs automatically every 10 minutes
  // No manual visit needed
  @Cron(CronExpression.EVERY_10_MINUTES)
  async autoSync() {
    const tokens = this.googleOauthService.getTokens();

    if (!tokens) {
      console.log(
        'Auto-sync skipped: no connected Google account yet',
      );
      return;
    }

    console.log('Auto-sync running...');

    await this.syncAllEvents(
      tokens.access_token,
      tokens.refresh_token,
    );

    console.log('Auto-sync completed');
  }
}