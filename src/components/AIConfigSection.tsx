import { useState } from "react";
import {
  Switch,
  Input,
  Button,
  Typography,
  Space,
  Divider,
  message,
  Select,
} from "antd";
import {
  SaveOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import { AISummarySettings } from "../types";
import { getThemeVars } from "../theme";

const { Text, Link } = Typography;

// AI 提供商类型
type ProviderType = "groq" | "deepseek" | "gemini" | "custom";

interface AIConfigSectionProps {
  description: string; // 功能描述
  settings: AISummarySettings;
  darkMode: boolean;
  onSettingsChange: (newSettings: AISummarySettings) => void;
  showEnabled?: boolean; // 是否显示启用开关（仅总结配置显示）
  showAutoFormatPrompt?: boolean; // 是否显示自动格式化选项（仅总结配置显示）
}

const AIConfigSection = ({
  description,
  settings,
  darkMode,
  onSettingsChange,
  showEnabled = false,
  showAutoFormatPrompt = false,
}: AIConfigSectionProps) => {
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);

  const themeVars = getThemeVars(darkMode);

  // 提供商配置信息
  const providerConfigs: Record<
    ProviderType,
    {
      name: string;
      description: string;
      getKeyUrl?: string;
    }
  > = {
    groq: {
      name: "Groq",
      description: "推荐使用，完全免费，速度超快",
      getKeyUrl: "https://console.groq.com/keys",
    },
    deepseek: {
      name: "DeepSeek",
      description: "国内服务，有限的免费额度",
      getKeyUrl: "https://platform.deepseek.com/api_keys",
    },
    gemini: {
      name: "Google Gemini",
      description: "Google 出品，慷慨的免费额度",
      getKeyUrl: "https://aistudio.google.com/app/apikey",
    },
    custom: {
      name: "自定义",
      description: "支持任意 OpenAI 兼容 API 服务",
    },
  };

  // 获取当前提供商配置
  const getCurrentProviderInfo = () => {
    const provider = settings.provider as ProviderType;
    return providerConfigs[provider] || providerConfigs.groq;
  };

  const getCurrentProviderConfig = () => {
    const defaultConfig = {
      apiKey: "",
      apiBaseUrl: "",
      model: "",
    };

    if (!settings.providers) {
      return defaultConfig;
    }

    return settings.providers[settings.provider] || defaultConfig;
  };

  // 遮罩 API Key
  const maskApiKey = (key: string): string => {
    if (!key || key.length <= 8) return key;
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  };

  // 更新设置
  const updateSetting = (key: string, value: any) => {
    const newSettings = {
      ...settings,
      [key]: value,
    };
    onSettingsChange(newSettings);
  };

  // 更新当前提供商配置
  const updateCurrentProviderConfig = (
    key: "apiKey" | "apiBaseUrl" | "model",
    value: string,
  ) => {
    const newSettings = {
      ...settings,
      providers: {
        ...settings.providers,
        [settings.provider]: {
          ...settings.providers[settings.provider],
          [key]: value,
        },
      },
    };
    onSettingsChange(newSettings);
  };

  // 切换提供商
  const handleProviderChange = (
    provider: "deepseek" | "groq" | "gemini" | "custom",
  ) => {
    const newSettings = {
      ...settings,
      provider,
    };
    onSettingsChange(newSettings);
  };

  // 保存 API Key
  const handleSaveApiKey = async () => {
    setApiKeySaving(true);
    try {
      message.success("API Key 保存成功");
      setIsEditingApiKey(false);
    } catch (error) {
      message.error("保存 API Key 失败");
    } finally {
      setApiKeySaving(false);
    }
  };

  return (
    <div style={{ padding: "16px 0" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* 启用开关（仅总结配置显示） */}
        {showEnabled && "enabled" in settings && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <Text style={{ color: themeVars.text }}>启用此配置</Text>
                <br />
                <Text
                  type="secondary"
                  style={{ fontSize: "12px", color: themeVars.textSecondary }}
                >
                  {description}
                </Text>
              </div>
              <Switch
                checked={(settings as AISummarySettings).enabled}
                onChange={(checked) => updateSetting("enabled", checked)}
              />
            </div>
            <Divider style={{ margin: 0 }} />
          </>
        )}

        {/* 自动格式化 Prompt（仅总结配置显示） */}
        {showAutoFormatPrompt && "autoFormatPrompt" in settings && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <Text style={{ color: themeVars.text }}>
                  AI 自动格式化 Prompt
                </Text>
                <br />
                <Text
                  type="secondary"
                  style={{ fontSize: "12px", color: themeVars.textSecondary }}
                >
                  查看 Prompt 详情时，自动转换为结构化 Markdown
                </Text>
              </div>
              <Switch
                checked={
                  (settings as AISummarySettings).autoFormatPrompt ?? true
                }
                onChange={(checked) =>
                  updateSetting("autoFormatPrompt", checked)
                }
                disabled={
                  showEnabled && !(settings as AISummarySettings).enabled
                }
              />
            </div>

            <Divider style={{ margin: 0 }} />
          </>
        )}

        {/* AI 提供商选择 */}
        <div>
          <Text style={{ color: themeVars.text, fontWeight: 500 }}>
            AI 提供商
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
            {getCurrentProviderInfo().description}
          </Text>
          <Select
            value={settings.provider}
            onChange={handleProviderChange}
            style={{ width: "100%" }}
            options={[
              {
                label: (
                  <div>
                    <div style={{ fontWeight: 500 }}>Groq (推荐)</div>
                    <div style={{ fontSize: 12, color: themeVars.success }}>
                      ✓ 完全免费 · 速度超快
                    </div>
                  </div>
                ),
                value: "groq",
              },
              {
                label: (
                  <div>
                    <div style={{ fontWeight: 500 }}>Google Gemini</div>
                    <div style={{ fontSize: 12, color: themeVars.success }}>
                      ✓ 慷慨免费额度
                    </div>
                  </div>
                ),
                value: "gemini",
              },
              {
                label: (
                  <div>
                    <div style={{ fontWeight: 500 }}>DeepSeek</div>
                    <div style={{ fontSize: 12, color: themeVars.warning }}>
                      ⚠ 有限免费额度
                    </div>
                  </div>
                ),
                value: "deepseek",
              },
              {
                label: (
                  <div>
                    <div style={{ fontWeight: 500 }}>自定义</div>
                    <div style={{ fontSize: 12, color: themeVars.info }}>
                      ⚙️ 任意 API 服务
                    </div>
                  </div>
                ),
                value: "custom",
              },
            ]}
          />
        </div>

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
              API Key
            </Text>
            {getCurrentProviderInfo().getKeyUrl && (
              <Link
                href={getCurrentProviderInfo().getKeyUrl}
                target="_blank"
                style={{ fontSize: "12px" }}
              >
                获取 API Key <LinkOutlined />
              </Link>
            )}
          </div>
          <Input.Password
            value={getCurrentProviderConfig().apiKey}
            onChange={(e) => {
              updateCurrentProviderConfig("apiKey", e.target.value);
              setIsEditingApiKey(true);
            }}
            placeholder={`请输入 ${getCurrentProviderInfo().name} API Key`}
            visibilityToggle={{
              visible: apiKeyVisible,
              onVisibleChange: setApiKeyVisible,
            }}
            onPressEnter={handleSaveApiKey}
            onFocus={() => setIsEditingApiKey(true)}
            style={{ marginBottom: "8px" }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              type="secondary"
              style={{ fontSize: "12px", color: themeVars.textSecondary }}
            >
              {getCurrentProviderConfig().apiKey && !isEditingApiKey
                ? `已设置: ${maskApiKey(getCurrentProviderConfig().apiKey)}`
                : "你的 API Key 将加密存储在本地"}
            </Text>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveApiKey}
              loading={apiKeySaving}
              size="small"
              disabled={!isEditingApiKey && !!getCurrentProviderConfig().apiKey}
            >
              保存 API Key
            </Button>
          </div>
        </div>

        {/* API 地址 */}
        <div>
          <Text style={{ color: themeVars.text }}>API 地址</Text>
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
            {settings.provider === "custom"
              ? "填写完整的 API 地址（支持任意服务、代理、中转）"
              : "高级选项，通常无需修改"}
          </Text>
          <Input
            value={getCurrentProviderConfig().apiBaseUrl}
            onChange={(e) =>
              updateCurrentProviderConfig("apiBaseUrl", e.target.value)
            }
            placeholder={
              settings.provider === "custom"
                ? "例如: https://your-api.com/v1"
                : getCurrentProviderConfig().apiBaseUrl
            }
          />
        </div>

        {/* 模型名称 */}
        <div>
          <Text style={{ color: themeVars.text }}>模型名称</Text>
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
            {settings.provider === "custom"
              ? "填写模型 ID（根据你的 API 服务要求）"
              : "默认已选择最优模型，通常无需修改"}
          </Text>
          <Input
            value={getCurrentProviderConfig().model}
            onChange={(e) =>
              updateCurrentProviderConfig("model", e.target.value)
            }
            placeholder={
              settings.provider === "custom"
                ? "例如: gpt-4, claude-3, llama-3 等"
                : getCurrentProviderConfig().model
            }
          />
        </div>
      </Space>
    </div>
  );
};

export default AIConfigSection;
