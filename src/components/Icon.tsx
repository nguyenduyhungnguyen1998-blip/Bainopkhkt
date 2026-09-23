/** Bộ icon nội tuyến (stroke 1.75, 24px) – không tải font icon để giữ offline-first và bundle nhỏ. */
const PATHS: Record<string, string> = {
  map: 'M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3Zm0 0v15m6-12v15',
  passport: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm6 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM8 17h8',
  quiz: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-2.5 6.5a2.5 2.5 0 1 1 4 2c-.9.7-1.5 1.2-1.5 2.5M12 17h.01',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7.5 7.5 0 0 0-2-1.2L14.6 3H9.4L9 5.7a7.5 7.5 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7.4 7.4 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7.5 7.5 0 0 0 2 1.2l.4 2.7h5.2l.4-2.7a7.5 7.5 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z',
  check: 'm5 13 4 4L19 7',
  play: 'M8 5v14l11-7z',
  back: 'm15 18-6-6 6-6',
  close: 'M6 6l12 12M18 6 6 18',
  sun: 'M12 4V2m0 20v-2M4 12H2m20 0h-2M5.6 5.6 4.2 4.2m15.6 15.6-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3.5-12.5-2 5-5 2 2-5 5-2Z',
  spark: 'M12 3v4m0 10v4M3 12h4m10 0h4M6.3 6.3l2.8 2.8m5.8 5.8 2.8 2.8M6.3 17.7l2.8-2.8m5.8-5.8 2.8-2.8',
  volume: 'M4 10v4h3l4 4V6L7 10H4Zm11-1a4 4 0 0 1 0 6m2.5-9a8 8 0 0 1 0 12',
  flag: 'M5 21V4m0 0h11l-1.5 3L16 10H5',
  award: 'M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 0v4l-3 2 3-1.5L15 21l-3-2Zm0-9.5 1 1.6 1.8.3-1.3 1.3.3 1.8-1.8-.9-1.8.9.3-1.8-1.3-1.3 1.8-.3 1-1.6Z',
  headphones: 'M4 14v-2a8 8 0 0 1 16 0v2M4 14h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5Zm16 0h-2a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-5Z',
  book: 'M12 5c-1.5-1.2-3.5-1.8-6-1.8S3 4 3 4v14s1.5-.5 3-.5 4.5.6 6 1.8c1.5-1.2 3.5-1.8 6-1.8s3 .5 3 .5V4s-1.5-.3-3-.3-4.5.6-6 1.3Zm0 0v14.3',
  locate: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM12 1v3m0 16v3M1 12h3m16 0h3',
  zoomIn: 'M11 5v12M5 11h12M21 21l-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9.3 17.3-4.6-4.6',
  zoomOut: 'M5 11h12M21 21l-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z',
  layers: 'm12 3 9 5-9 5-9-5 9-5Zm-9 9.5 9 5 9-5',
  pause: 'M8 5v14M16 5v14',
  warn: 'M12 3 2.5 20h19L12 3Zm0 7v4m0 3v.01',
  leaf: 'M5 19c0-9 5-13 14-14-1 9-5 14-14 14Zm0 0c3-5 6-8 9-9',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-14v6l4 2',
  share: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13',
};

export function Icon({ name, size = 24, class: cls }: { name: string; size?: number; class?: string }) {
  return (
    <svg
      class={cls}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name] ?? PATHS.spark} />
    </svg>
  );
}
