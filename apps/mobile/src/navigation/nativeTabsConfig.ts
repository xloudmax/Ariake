type NativeTabConfig = {
  name: string;
  labelKey: "tabs.home" | "tabs.search" | "tabs.insight" | "tabs.create" | "tabs.profile";
  role?: "search";
  sf: {
    default: string;
    selected: string;
  };
};

export const nativeTabs = [
  {
    name: "index",
    labelKey: "tabs.home",
    sf: { default: "house", selected: "house.fill" },
  },
  {
    name: "search",
    labelKey: "tabs.search",
    role: "search",
    sf: { default: "magnifyingglass", selected: "magnifyingglass" },
  },
  {
    name: "insight",
    labelKey: "tabs.insight",
    sf: { default: "waveform.path.ecg", selected: "waveform.path.ecg" },
  },
  {
    name: "create",
    labelKey: "tabs.create",
    sf: { default: "plus.circle", selected: "plus.circle.fill" },
  },
  {
    name: "profile",
    labelKey: "tabs.profile",
    sf: { default: "person", selected: "person.fill" },
  },
] as const satisfies readonly NativeTabConfig[];
