import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";

import { useI18n } from "../../src/i18n/I18nProvider";
import { nativeTabs } from "../../src/navigation/nativeTabsConfig";

export default function TabLayout() {
  const { t } = useI18n();

  return (
    <NativeTabs minimizeBehavior="onScrollDown">
      {nativeTabs.map((tab) => (
        <NativeTabs.Trigger
          key={tab.name}
          name={tab.name}
          role={"role" in tab ? tab.role : undefined}
        >
          <Label>{t(tab.labelKey)}</Label>
          <Icon sf={tab.sf} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
