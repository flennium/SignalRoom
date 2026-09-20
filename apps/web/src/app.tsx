import { HomePage } from './routes/home-page.js';
import { RoomPage } from './routes/room-page.js';
import { basePath } from './base-path.js';

export function App() {
  const relativePath =
    window.location.pathname.slice(basePath.replace(/\/$/, '').length) || '/';
  const match = relativePath.match(/^\/r\/([^/]+)\/?$/);
  if (match?.[1]) return <RoomPage roomKey={decodeURIComponent(match[1])} />;
  return <HomePage />;
}
