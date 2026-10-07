import { google } from "googleapis";

function getGoogleAuth() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error(
      "Missing Google Sheets environment variables: GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SPREADSHEET_ID"
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n")
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  return { auth, spreadsheetId };
}

export async function readTransactions() {
  const { auth, spreadsheetId } = getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "01_TRANSAKSI_UANG!A:Z"
  });

  return response.data.values ?? [];
}
