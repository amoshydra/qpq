import { ReactNode, useEffect } from 'react';

const enterAltScreenCommand = '\x1b[?1049h';
const moveToHome = '\x1b[H';
const leaveAltScreenCommand = '\x1b[?1049l';

const exitFullScreen = () => {
  process.stdout.write(leaveAltScreenCommand);
};

const FullScreen = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    // destroy alternate screen on unmount
    return exitFullScreen;
  }, []);
  // trigger alternate screen
  process.stdout.write(enterAltScreenCommand);
  process.stdout.write(moveToHome);
  return children;
};

export { exitFullScreen };
export default FullScreen;
