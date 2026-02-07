import { useState } from "react";
import {
  Input,
  Button,
  Typography,
  Space,
  message,
} from "antd";
import {
  SaveOutlined,
  ApiOutlined,
} from "@ant-design/icons";
import { AIChatSettings } from "../types";
import { getThemeVars } from "../theme";

const { Text } = Typography;

interface AIChatConfigSectionProps {
  settings: AIChatSettings;
  darkMode: boolean;
  onSettingsChange: (newSettings: AIChatSettings) => void;
}

const AIChatConfigSection = ({
  settings,
  darkMode,
  onSettingsChange,
}: AIChatConfigSectionProps) => {
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const themeVars = getThemeVars(darkMode);

  // 遮罩 API Key
  const maskApiKey = (key: string): string => {
    if (!key || key.length <= 8) return key;
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  };

  // 更新设置
  const updateSetting = (key: keyof AIChatSettings, value: string) => {
    const newSettings = {
      ...settings,
      [key]: value,
    };
    onSettingsChange(newSettings);
    setIsEditing(true);
  };

  // 保存配置
  const handleSave = async () => {
    setApiKeySaving(true);
    try {
      message.success("配置保存成功");
      setIsEditing(false);
    } catch (error) {
      message.error("保存配置失败");
    } finally {
      setApiKeySaving(false);
    }
  };

  // 判断配置是否完整
  const isConfigComplete = settings.apiKey && settings.apiBaseUrl && settings.model;

  return (
    <div style={{ padding: "16px 0" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* API Key */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <Text style={{ color: themeVars.text, fontWeight: 500 }}>
              <ApiOutlined style={{ marginRight: 8 }} />
              API Key
            </Text>
          </div>
          <Input.Password
            value={settings.apiKey}
            onChange={(e) => updateSetting("apiKey", e.target.value)}
            placeholder="请输入 API Key"
            visibilityToggle={{
              visible: apiKeyVisible,
              onVisibleChange: setApiKeyVisible,
            }}
            onPressEnter={handleSave}
            onFocus={() => setIsEditing(true)}
            style={{ marginBottom: "8px" }}
          />
          <Text
            type="secondary"
            style={{ fontSize: "12px", color: themeVars.textSecondary }}
          >
            {settings.apiKey && !isEditing
              ? `已设置: ${maskApiKey(settings.apiKey)}`
              : "你的 API Key 将加密存储在本地"}
          </Text>
        </div>

        {/* API 地址 */}
        <div>
          <Text style={{ color: themeVars.text, fontWeight: 500 }}>
            API 地址
          </Text>
          <br />
          <Text
            type="secondary"
            style={{
              fontSize: "12px",
              color: themeVars.textSecondary,
              marginBottom: "8px",
              display: "block",
            }}
          >
            填写完整的 API 地址（支持任意服务、代理、中转）
          </Text>
          <Input
            value={settings.apiBaseUrl}
            onChange={(e) => updateSetting("apiBaseUrl", e.target.value)}
            placeholder="例如: https://api.deepseek.com/v1"
            onPressEnter={handleSave}
            onFocus={() => setIsEditing(true)}
          />
        </div>

        {/* 模型名称 */}
        <div>
          <Text style={{ color: themeVars.text, fontWeight: 500 }}>
            模型名称
          </Text>
          <br />
          <Text
            type="secondary"
            style={{
              fontSize: "12px",
              color: themeVars.textSecondary,
              marginBottom: "8px",
              display: "block",
            }}
          >
            填写模型 ID（例如: deepseek-chat, gpt-4, claude-3 等）
          </Text>
          <Input
            value={settings.model}
            onChange={(e) => updateSetting("model", e.target.value)}
            placeholder="例如: deepseek-chat"
            onPressEnter={handleSave}
            onFocus={() => setIsEditing(true)}
          />
        </div>

        {/* 保存按钮 */}
        <div style={{ textAlign: "right" }}>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={apiKeySaving}
            disabled={!isEditing && !!isConfigComplete}
          >
            保存配置
          </Button>
        </div>
      </Space>
    </div>
  );
};

export default AIChatConfigSection;
