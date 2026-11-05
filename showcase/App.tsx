import { BgColorsOutlined } from "@ant-design/icons";
import { Layout, Select, Typography, theme } from "antd";
import { useEffect, useMemo, useState } from "react";

import { STORIES } from "./stories";
import { THEME_PRESETS } from "./themes";
import { useThemeSwitcher } from "./ThemeSwitcher";

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

function parseHash(): string {
  const h = window.location.hash.replace(/^#\/?/, "");
  return h || STORIES[0].id;
}

export function App() {
  const { token } = theme.useToken();
  const { activeId: themeId, setActiveId: setThemeId } = useThemeSwitcher();
  const [activeId, setActiveId] = useState<string>(() => parseHash());

  useEffect(() => {
    const onHash = () => setActiveId(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const grouped = useMemo(() => {
    const order = ["Primitives", "Forms", "Overlays", "Layouts", "Data display", "Workflow", "Content", "Legacy"];
    const groups = new Map<string, typeof STORIES>();
    for (const s of STORIES) {
      if (!groups.has(s.group)) groups.set(s.group, []);
      groups.get(s.group)!.push(s);
    }
    return order.filter((g) => groups.has(g)).map((g) => [g, groups.get(g)!] as const);
  }, []);

  const active = STORIES.find((s) => s.id === activeId) ?? STORIES[0];
  const activeTheme = THEME_PRESETS.find((p) => p.id === themeId);

  return (
    <Layout style={{ height: "100vh" }}>
      <Sider
        width={260}
        theme="light"
        style={{
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
          overflowY: "auto",
          padding: "20px 16px",
        }}
      >
        <Title level={5} style={{ margin: 0 }}>
          orca-ui
        </Title>
        <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 20 }}>
          Component showcase
        </Text>

        <div style={{ marginBottom: 20 }}>
          <Text
            type="secondary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginBottom: 4,
              paddingLeft: 4,
            }}
          >
            <BgColorsOutlined style={{ fontSize: 12 }} />
            Theme
          </Text>
          <Select
            size="middle"
            value={themeId}
            onChange={setThemeId}
            style={{ width: "100%" }}
            options={THEME_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
          />
          {activeTheme && (
            <Text
              type="secondary"
              style={{ fontSize: 11, display: "block", marginTop: 6, paddingLeft: 4 }}
            >
              {activeTheme.description}
            </Text>
          )}
        </div>

        {grouped.map(([group, items]) => (
          <div key={group} style={{ marginBottom: 16 }}>
            <Text
              type="secondary"
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                paddingLeft: 8,
              }}
            >
              {group}
            </Text>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 4 }}>
              {items.map((s) => {
                const selected = s.id === activeId;
                return (
                  <a
                    key={s.id}
                    href={`#/${s.id}`}
                    style={{
                      display: "block",
                      padding: "6px 10px",
                      borderRadius: token.borderRadius,
                      textDecoration: "none",
                      fontSize: 13,
                      color: selected ? token.colorPrimary : token.colorText,
                      background: selected ? token.colorPrimaryBg : "transparent",
                      fontWeight: selected ? 600 : 500,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!selected) e.currentTarget.style.background = token.colorFillTertiary;
                    }}
                    onMouseLeave={(e) => {
                      if (!selected) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {s.label}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </Sider>
      <Content
        style={{
          overflowY: "auto",
          padding: 32,
          background: token.colorBgLayout,
        }}
      >
        {active.render()}
      </Content>
    </Layout>
  );
}
