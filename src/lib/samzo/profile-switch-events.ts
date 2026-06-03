import { useEffect, useState } from "react";

const ACTIVE_PROFILE_CHANGED_EVENT = "samzo:activeProfileChanged";
const ACTIVE_PROFILE_STORAGE_KEY = "samzo.activeProfileId";

export function useActiveProfileSwitchTrigger() {
  const [activeProfileId, setActiveProfileId] = useState<string | null>(
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY)
  );

  useEffect(() => {
    const handleProfileSwitch = () => {
      setActiveProfileId(
        typeof window === "undefined"
          ? null
          : window.localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY)
      );
    };

    window.addEventListener(ACTIVE_PROFILE_CHANGED_EVENT, handleProfileSwitch);

    return () => {
      window.removeEventListener(ACTIVE_PROFILE_CHANGED_EVENT, handleProfileSwitch);
    };
  }, []);

  return activeProfileId;
}
