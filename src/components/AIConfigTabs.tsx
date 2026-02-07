import { useState } from "react";
import { Card, Tabs, Space, Tag } from "antd";
import { RobotOutlined } from "@ant-design/icons";
import { AIChatSettings, AISummarySettings } from "../types";
import { getThemeVars } from "../theme";
import AIChatConfigSection from "./AIChatConfigSection";
import AIConfigSection from "./AIConfigSection";

interface AIConfigTabsProps {
  aiChat: AIChatSettings;
  aiSummary: AISummarySettings;
  darkMode: boolean;
  onAIChatChange: (settings: AIChatSettings) => void;
  onAISummaryChange: (settings: AISummarySettings) => void;
}

const AIConfigTabs = ({
  aiChat,
  aiSummary,
  darkMode,
  onAIChatChange,
  onAISummaryChange,
}: AIConfigTabsProps) => {
  const themeVars = getThemeVars(darkMode);
  const [activeTab, setActiveTab] = useState<string>("chat");

  // AI 对话无 enabled，总结有 enabled
  const anyEnabled = aiSummary.enabled;

  return (
    <Card
      id="ai-settings"
      title={
        <Space>
          <RobotOutlined style={{ color: themeVars.primary }} />
          <span>AI 功能配置</span>
          <Tag color={anyEnabled ? "success" : "default"}>
            {anyEnabled ? "已启用" : "未启用"}
          </Tag>
        </Space>
      }
      style={{
        backgroundColor: themeVars.bgContainer,
        borderColor: themeVars.border,
      }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "chat",
            label: (
              <Space>
                <span>AI 对话</span>
              </Space>
            ),
            children: (
              <AIChatConfigSection
                settings={aiChat}
                darkMode={darkMode}
                onSettingsChange={onAIChatChange}
              />
            ),
          },
          {
            key: "summary",
            label: (
              <Space>
                <span>AI 总结</span>
                {aiSummary.enabled && (
                  <Tag color="success" style={{ marginLeft: 4 }}>
                    已启用
                  </Tag>
                )}
              </Space>
            ),
            children: (
              <AIConfigSection
                description="使用 AI 自动生成会话总结，适合使用快速经济的模型（如 Groq、Gemini Flash）"
                settings={aiSummary}
                darkMode={darkMode}
                onSettingsChange={(newSettings) => onAISummaryChange(newSettings)}
                showEnabled={true}
                showAutoFormatPrompt={true}
              />
            ),
          },
        ]}
      />
    </Card>
  );
};

export default AIConfigTabs;
