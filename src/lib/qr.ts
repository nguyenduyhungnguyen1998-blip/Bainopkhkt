/**
 * Chữ ký QR tĩnh (P3): URL in trên tem QR có dạng `#/d/<site>/<spot>?s=<sig>`,
 * sig = 16 hex đầu của HMAC-SHA256("siteId/spotId", QR_SECRET).
 * Đây là chữ ký tĩnh nhúng trong app — mục tiêu là chống URL đoán mò/chỉnh tay
 * trên bản demo, không phải bảo mật phía server (không có backend).
 * `scripts/sign-qr.mjs` dùng đúng thuật toán này để in bảng mã QR.
 */

export const QR_SECRET = 'mdv-qr-v1';
const SIG_LEN = 16; // 64 bit đầu – đủ ngắn để gõ tay, đủ dài chống đoán trong phạm vi demo

async function hmacHex(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(QR_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Payload ký = qrId bất biến của điểm (không phụ thuộc slug địa danh).
 * Đổi slug siteId/spotId vẫn giữ được chữ ký trên tem QR đã in.
 * Fallback "site/spot" cho điểm cũ chưa khai qrId.
 */
export function qrPayload(siteId: string, spotId: string, qrId?: string): string {
  return qrId ?? `${siteId}/${spotId}`;
}

export async function signSpot(siteId: string, spotId: string, qrId?: string): Promise<string> {
  return (await hmacHex(qrPayload(siteId, spotId, qrId))).slice(0, SIG_LEN);
}

/**
 * So khớp không timing-safe (client-side tĩnh, chấp nhận được) — chỉ kiểm chuỗi khớp.
 * Chấp nhận cả chữ ký payload cũ "site/spot": tem QR in trước khi có qrId vẫn mở được.
 */
export async function verifySignature(siteId: string, spotId: string, sig: string, qrId?: string): Promise<boolean> {
  if (!/^[0-9a-f]+$/i.test(sig) || sig.length !== SIG_LEN) return false;
  const s = sig.toLowerCase();
  if ((await signSpot(siteId, spotId, qrId)) === s) return true;
  return qrId != null && (await signSpot(siteId, spotId)) === s;
}
