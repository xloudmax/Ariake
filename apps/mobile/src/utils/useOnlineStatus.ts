import { useEffect, useState } from "react";

import { isOnline, subscribeOnline } from "../utils/network";

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(isOnline);
  useEffect(() => subscribeOnline(setOnline), []);
  return online;
}
