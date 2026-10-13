/**
 * Upload fișiere de pe device → server → Cloudinary. Alege un fișier (expo-document-picker)
 * și îl urcă prin `POST /pc/v1/uploads` (multipart). Întoarce { url, resourceType, format, bytes, name }.
 * Token-ul + baza URL = aceleași ca în clientul global `api`.
 */
import * as DocumentPicker from "expo-document-picker";
import { CONFIG } from "../../global/config";
import { storage } from "../../global/utils/storage";

/** Urcă un asset {uri, name, mimeType} prin server→Cloudinary. */
export async function uploadAsset(asset) {
  if (!asset?.uri) throw new Error("Fișier invalid.");
  const token = await storage.getItem(CONFIG.TOKEN_KEY);
  const form = new FormData();
  form.append("file", { uri: asset.uri, name: asset.name || "file", type: asset.mimeType || "application/octet-stream" });
  let resp;
  try {
    resp = await fetch(`${CONFIG.API_URL}/pc/v1/uploads`, {
      method: "POST",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) }, // fără Content-Type: fetch pune boundary-ul
      body: form,
    });
  } catch (e) {
    throw new Error("Nu se poate contacta serverul pentru upload.");
  }
  let data = {};
  try { data = await resp.json(); } catch (e) {}
  if (!resp.ok) throw new Error(data.error || `Eroare la upload (${resp.status}).`);
  return data;
}

/** Deschide pickerul, apoi urcă. `type` = MIME filter (ex. "audio/*", "application/pdf"). */
export async function pickAndUploadFile({ type = "*/*" } = {}) {
  const res = await DocumentPicker.getDocumentAsync({ type, copyToCacheDirectory: true, multiple: false });
  if (res.canceled) return null;
  const asset = res.assets?.[0];
  if (!asset) return null;
  return await uploadAsset(asset);
}

export default { uploadAsset, pickAndUploadFile };
