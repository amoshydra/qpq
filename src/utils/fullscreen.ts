const ENTER_ALT_SCREEN = '\x1b[?1049h';
const MOVE_HOME = '\x1b[H';
const LEAVE_ALT_SCREEN = '\x1b[?1049l';

let fullscreenActive = false;

export function enterFullscreen(): void {
  if (fullscreenActive || !process.stdout.isTTY) {
    return;
  }

  fullscreenActive = true;
  process.stdout.write(`${ENTER_ALT_SCREEN}${MOVE_HOME}`);
}

export function exitFullscreen(): void {
  if (!fullscreenActive) {
    return;
  }

  fullscreenActive = false;
  process.stdout.write(LEAVE_ALT_SCREEN);
}
