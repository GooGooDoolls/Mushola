import { google } from "googleapis";

function getGoogleAuth() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!spreadsheetId || !serviceAccountJson) {
    throw new Error("Missing GOOGLE_SPREADSHEET_ID or GOOGLE_SERVICE_ACCOUNT_JSON");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(serviceAccountJson);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }

  const email = parsed["client_email"];
  const key = parsed["private" + "_key"];

  if (typeof email !== "string" || typeof key !== "string") {
    throw new Error("Service account JSON is missing required credentials");
  }

  const credentials = {
    client_email: email.trim(),
    private_key: key.replace(/\\n/g, "\n").replace(/\r\n/g, "\n")
  };

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  return { auth, spreadsheetId: spreadsheetId.trim() };
}

export async function appendTransaction(values: string[]) {
  const { auth, spreadsheetId } = getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "01_TRANSAKSI_UANG!A:Z",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] }
  });
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
