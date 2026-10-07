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
    range: "01_TRANSAKSI_UANG!A:N",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] }
  });
}

export async function readSheet(sheetName: string) {
  const { auth, spreadsheetId } = getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:Z`
  });
  return response.data.values ?? [];
}

export async function readSheet(sheetName: string) {
  const { auth, spreadsheetId } = getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!A:Z` });
  return response.data.values ?? [];
}

export async function readTransactions() {
  const { auth, spreadsheetId } = getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "01_TRANSAKSI_UANG!A:N"
  });

  return response.data.values ?? [];
}

export async function updateTransaction(rowNumber: number, values: string[]) {
  const { auth, spreadsheetId } = getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `01_TRANSAKSI_UANG!A${rowNumber}:N${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] }
  });
}

export async function deleteTransaction(rowNumber: number) {
  const { auth, spreadsheetId } = getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties"
  });

  const sheet = meta.data.sheets?.find(
    s => s.properties?.title === "01_TRANSAKSI_UANG"
  );
  const sheetId = sheet?.properties?.sheetId;

  if (sheetId === undefined) {
    throw new Error("Sheet 01_TRANSAKSI_UANG tidak ditemukan");
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: "ROWS",
            startIndex: rowNumber - 1,
            endIndex: rowNumber
          }
        }
      }]
    }
  });
}
