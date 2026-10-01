/**
 * Chỉ một nguồn âm thanh phát cùng lúc — tránh narration chồng lên bản thu/video.
 * - Bắt 'play' của mọi <audio>/<video> (capture): tạm dừng media khác + báo narration dừng.
 * - 'mdv:pause-media' do narration bắn khi bắt đầu đọc: tạm dừng mọi media đang phát.
 * Ambient (nền WebAudio) cố ý nằm ngoài — nó được thiết kế để nền dưới thuyết minh.
 */
export function installAudioBus() {
  document.addEventListener(
    'play',
    (e) => {
      const el = e.target as HTMLMediaElement | null;
      if (!el || typeof el.pause !== 'function') return;
      for (const m of document.querySelectorAll<HTMLMediaElement>('audio,video')) {
        if (m !== el) m.pause();
      }
      window.dispatchEvent(new CustomEvent('mdv:pause-narration'));
    },
    true,
  );
  window.addEventListener('mdv:pause-media', () => {
    for (const m of document.querySelectorAll<HTMLMediaElement>('audio,video')) m.pause();
  });
}
