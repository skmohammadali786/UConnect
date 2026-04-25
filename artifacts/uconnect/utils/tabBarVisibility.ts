type Listener = (visible: boolean) => void;

let tabBarVisible = true;
const listeners = new Set<Listener>();

export function setTabBarVisible(visible: boolean) {
  if (tabBarVisible === visible) return;
  tabBarVisible = visible;
  listeners.forEach((listener) => listener(visible));
}

export function subscribeTabBarVisibility(listener: Listener) {
  listeners.add(listener);
  listener(tabBarVisible);
  return () => {
    listeners.delete(listener);
  };
}
