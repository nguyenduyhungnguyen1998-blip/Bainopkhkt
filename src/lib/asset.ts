/**
 * Đường dẫn asset tôn trọng base sub-path khi deploy (GitHub Pages `/Bainopkhkt/`).
 * Dữ liệu giữ dạng `/img/...` tuyệt đối-từ-root; render qua helper này để
 * không 404 khi site nằm dưới thư mục con.
 */
export function asset(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}
