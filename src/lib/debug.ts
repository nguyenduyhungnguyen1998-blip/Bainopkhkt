/**
 * Cờ debug dùng chung: bật bằng ?debug=1 (ghi nhớ vào localStorage) hoặc mdv.debug=1,
 * tắt bằng ?debug=0. Đọc đồng bộ để gate UI demo khỏi production.
 */
export function isDebug(): boolean {
  try {
    const q = new URLSearchParams(location.search).get('debug');
    if (q === '1') {
      localStorage.setItem('mdv.debug', '1');
      return true;
    }
    if (q === '0') {
      localStorage.removeItem('mdv.debug');
      return false;
    }
    return localStorage.getItem('mdv.debug') === '1';
  } catch {
    return false;
  }
}
