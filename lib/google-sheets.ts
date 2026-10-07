import { google } from "googleapis";

function getGoogleAuth() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (!clientEmail || !rawPrivateKey || !spreadsheetId) {
    throw new Error(
      "Missing Google Sheets environment variables: GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SPREADSHEET_ID"
    );
  }

  // Vercel can store PEM newlines either as real line breaks or as the
  // escaped sequence \n. Normalize both formats before handing the key to
  // Google's auth library. Also tolerate accidental surrounding quotes.
  const privateKey = rawPrivateKey
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\r/g, "\r")
    .replace(/\n/g, "\n")
    .replace(/\r\n/g, "\n");

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail.trim(),
      private_key: privateKey
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  return { auth, spreadsheetId: spreadsheetId.trim() };
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
