export const THEME_STORAGE_KEY = 'theme';

/**
 * Inline, render-blocking script for `<head>`: it applies a stored theme choice before first paint,
 * so there's no flash of the wrong theme. With no stored choice, CSS follows the system preference.
 * Server component on purpose: scripts rendered from client components don't run after hydration.
 */
export function ThemeScript() {
  const code = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
