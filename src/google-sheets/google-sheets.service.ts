import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';

@Injectable()
export class GoogleSheetsService {
  // =========================
  // APPEND NEW ROW
  // =========================
  async appendRow(
    accessToken: string,
    refreshToken: string,
    row: any[],
  ) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const sheets = google.sheets({
      version: 'v4',
      auth: oauth2Client,
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A:M',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });
  }

  // =========================
  // FIND ROW BY EVENT ID
  // =========================
  async findRowByEventId(
    accessToken: string,
    refreshToken: string,
    eventId: string,
  ) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const sheets = google.sheets({
      version: 'v4',
      auth: oauth2Client,
    });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A:L',
    });

    const rows = response.data.values || [];

    // Column L (index 11) contains the Event ID.
    // Row 1 is the header, so data starts from index 1.
    const rowIndex = rows.findIndex(
      (r, i) => i > 0 && r[11] === eventId,
    );

    // Google Sheets rows are 1-indexed
    return rowIndex === -1 ? null : rowIndex + 1;
  }

  // =========================
  // UPSERT ROW
  // =========================
  async upsertRow(
    accessToken: string,
    refreshToken: string,
    eventId: string,
    row: any[],
  ): Promise<number> {
    // First check whether Event ID already exists
    const existingRowNumber = await this.findRowByEventId(
      accessToken,
      refreshToken,
      eventId,
    );

    // =========================================
    // EVENT ID EXISTS → UPDATE EXISTING ROW
    // =========================================
    if (existingRowNumber) {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI,
      );

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      const sheets = google.sheets({
        version: 'v4',
        auth: oauth2Client,
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `Sheet1!A${existingRowNumber}:L${existingRowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [row],
        },
      });

      console.log(
        `Existing row ${existingRowNumber} updated (no duplicate created)`,
      );

      return existingRowNumber;
    }

    // =========================================
    // EVENT ID DOES NOT EXIST → APPEND NEW ROW
    // =========================================
    await this.appendRow(
      accessToken,
      refreshToken,
      row,
    );

    const newRowNumber = await this.findRowByEventId(
      accessToken,
      refreshToken,
      eventId,
    );

    console.log(`New row ${newRowNumber} appended`);

    return newRowNumber as number;
  }

  // =========================
  // UPDATE CANDIDATE INFO
  // =========================
  async updateCandidateInfo(
    accessToken: string,
    refreshToken: string,
    rowNumber: number,
    name: string,
    phone: string,
  ) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const sheets = google.sheets({
      version: 'v4',
      auth: oauth2Client,
    });

    // Candidate Name → Column C
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `Sheet1!C${rowNumber}:C${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[name]],
      },
    });

    // Contact Number → Column I
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `Sheet1!I${rowNumber}:I${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[phone]],
      },
    });
  }
}