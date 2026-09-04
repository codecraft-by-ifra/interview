import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';

@Injectable()
export class GoogleSheetsService {
  private getSheetsClient(accessToken: string, refreshToken: string) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    return google.sheets({ version: 'v4', auth: oauth2Client });
  }

  // =========================
  // APPEND NEW ROW (auto-calculates Sr. No.)
  // =========================
  async appendRow(accessToken: string, refreshToken: string, row: any[]) {
    const sheets = this.getSheetsClient(accessToken, refreshToken);

    // Count existing data rows (excluding header) to compute the next Sr. No.
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A:A',
    });
    const dataRowCount = (existing.data.values?.length || 1) - 1; // minus header
    row[0] = dataRowCount + 1; // overwrite Sr. No. with the real next number

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A:M',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
  }

  // =========================
  // FIND ROW BY EVENT ID
  // =========================
  async findRowByEventId(accessToken: string, refreshToken: string, eventId: string) {
    const sheets = this.getSheetsClient(accessToken, refreshToken);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A:L',
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((r, i) => i > 0 && r[11] === eventId);
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
    const existingRowNumber = await this.findRowByEventId(accessToken, refreshToken, eventId);

    if (existingRowNumber) {
      const sheets = this.getSheetsClient(accessToken, refreshToken);

      // Update B:L only — keep column A (Sr. No.) untouched so it doesn't reset
      const rowWithoutSrNo = row.slice(1);

      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `Sheet1!B${existingRowNumber}:L${existingRowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowWithoutSrNo] },
      });

      console.log(`Existing row ${existingRowNumber} updated (no duplicate created)`);
      return existingRowNumber;
    }

    await this.appendRow(accessToken, refreshToken, row);
    const newRowNumber = await this.findRowByEventId(accessToken, refreshToken, eventId);

    console.log(`New row ${newRowNumber} appended`);
    return newRowNumber as number;
  }

  // =========================
  // UPDATE CANDIDATE INFO (RAW avoids Sheets misreading dashed numbers as formulas)
  // =========================
  async updateCandidateInfo(
    accessToken: string,
    refreshToken: string,
    rowNumber: number,
    name: string,
    phone: string,
  ) {
    const sheets = this.getSheetsClient(accessToken, refreshToken);

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `Sheet1!C${rowNumber}:C${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[name]] },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `Sheet1!I${rowNumber}:I${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[`'${phone}`]] }, // leading apostrophe forces text, never a formula
    });
  }
}