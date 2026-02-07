import { useState, useEffect, useRef } from "react";
import {
  Card,
  Switch,
  Input,
  Button,
  Typography,
  Space,
  Divider,
  message,
  Segmented,
  Modal,
} from "antd";
import {
  BulbOutlined,
  SunOutlined,
  MoonOutlined,
  LaptopOutlined,
  FolderOpenOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  CodeOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import { AppSettings } from "../types";
import { getThemeVars } from "../theme";
import ConfigFileEditor from "./ConfigFileEditor";
import ConfigEditor, { ConfigEditorRef } from "./ConfigEditor";
import RecordControl, { RecordControlRef } from "./RecordControl";
import { getElectronModalConfig } from "./ElectronModal";
import AIConfigTabs from "./AIConfigTabs";

const { Text } = Typography;

interface SettingsViewProps {
  darkMode: boolean;
  onThemeModeChange?: (themeMode: "light" | "dark" | "system") => void;
  claudeDir?: string;
  scrollToSection?: string | null;
  onScrollComplete?: () => void;
}

function SettingsView({
  darkMode,
  onThemeModeChange,
  claudeDir,
  scrollToSection,
  onScrollComplete,
}: SettingsViewProps) {
  const [settings, setSettings] = useState<AppSettings>({
    themeMode: "system",
    autoStart: false,
    // AI 对话配置（简化版，只需三个字段）
    aiChat: {
      apiKey: "",
      apiBaseUrl: "",
      model: "",
    },
    // AI 总结配置（有 enabled 和自动格式化）
    aiSummary: {
      enabled: false,
      provider: "groq",
      autoFormatPrompt: true,
      formatTimeout: 15000,
      providers: {
        groq: {
          apiKey: "",
          apiBaseUrl: "https://api.groq.com/openai/v1",
          model: "llama-3.3-70b-versatile",
        },
        deepseek: {
          apiKey: "",
          apiBaseUrl: "https://api.deepseek.com/v1",
          model: "deepseek-chat",
        },
        gemini: {
          apiKey: "",
          apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
          model: "gemini-2.0-flash-exp",
        },
        custom: {
          apiKey: "",
          apiBaseUrl: "",
          model: "",
        },
      },
    },
  })
  const [configEditorVisible, setConfigEditorVisible] = useState(false);
  const [configPath, setConfigPath] = useState("");

  // ConfigEditor 的 ref，用于刷新数据
  const configEditorRef = useRef<ConfigEditorRef>(null);
  // RecordControl 的 ref，用于刷新数据
  const recordControlRef = useRef<RecordControlRef>(null);

  const themeVars = getThemeVars(darkMode);

  // 处理滚动到指定区域
  useEffect(() => {
    if (scrollToSection) {
      const timer = setTimeout(() => {
        const element = document.getElementById(scrollToSection);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          // 添加高亮效果
          element.style.transition = "box-shadow 0.3s ease";
          element.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.3)";
          setTimeout(() => {
            element.style.boxShadow = "";
          }, 2000);
        }
        onScrollComplete?.();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [scrollToSection, onScrollComplete]);

  // 打开配置文件编辑器
  const handleShowConfigPath = async () => {
    try {
      const path = await window.electronAPI.getConfigPath();
      setConfigPath(path);
      setConfigEditorVisible(true);
    } catch (error) {
      message.error("获取配置路径失败");
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await window.electronAPI.getAppSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error("加载设置失败:", error);
    }
  };

  // 即时保存设置（不包括 API Key）
  const saveSettingsImmediately = async (newSettings: AppSettings) => {
    try {
      await window.electronAPI.saveAppSettings(newSettings);
    } catch (error) {
      console.error("保存设置失败:", error);
      message.error("保存设置失败");
    }
  };

  // 更新 AI 对话配置
  const handleAIChatChange = (newAIChatSettings: typeof settings.aiChat) => {
    const newSettings = {
      ...settings,
      aiChat: newAIChatSettings,
    };
    setSettings(newSettings);
    saveSettingsImmediately(newSettings);
  };

  // 更新 AI 总结配置
  const handleAISummaryChange = (
    newAISummarySettings: typeof settings.aiSummary,
  ) => {
    const newSettings = {
      ...settings,
      aiSummary: newAISummarySettings,
    };
    setSettings(newSettings);
    saveSettingsImmediately(newSettings);
  };

  // 卸载应用
  const handleUninstall = () => {
    Modal.confirm({
      title: "确认卸载应用",
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>卸载应用将执行以下操作：</p>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>移除应用配置文件（API Key、设置等）</li>
            <li>移除所有 Claude Code 配置备份文件</li>
            <li>保留 Claude Code 原始配置（settings.json 和 history.jsonl）</li>
            <li>关闭应用</li>
          </ul>
          <p style={{ marginTop: 8, color: themeVars.error, fontWeight: 500 }}>
            此操作不可恢复，请确认是否继续？
          </p>
        </div>
      ),
      okText: "确认卸载",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          await window.electronAPI.uninstallApp();
          message.success("应用已卸载");
        } catch (error: any) {
          message.error(`卸载失败: ${error?.message || "未知错误"}`);
        }
      },
      ...getElectronModalConfig(),
    });
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: themeVars.bgLayout,
      }}
    >
      {/* 顶部标题栏 - 可拖动 */}
      <div
        style={
          {
            padding: "16px",
            borderBottom: `1px solid ${themeVars.borderSecondary}`,
            background: themeVars.bgSection,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
            WebkitAppRegion: "drag",
          } as React.CSSProperties
        }
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          应用设置
        </Text>
      </div>

      {/* 内容区域 */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "24px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(400px, 100%), 1fr))",
            gap: "24px",
            maxWidth: "1400px",
            margin: "0 auto",
            paddingBottom: "24px",
            width: "100%",
          }}
        >
          {/* 卡片 1: 通用设置 */}
          <Card
            title={
              <Space>
                <BulbOutlined style={{ color: themeVars.primary }} />
                <span>通用设置</span>
              </Space>
            }
            style={{
              backgroundColor: themeVars.bgContainer,
              borderColor: themeVars.border,
            }}
          >
            <Space vertical size="large" style={{ width: "100%" }}>
              <div>
                <Text style={{ color: themeVars.text, fontWeight: 500 }}>
                  外观主题
                </Text>
                <br />
                <Text
                  type="secondary"
                  style={{
                    fontSize: "12px",
                    color: themeVars.textSecondary,
                    marginBottom: "12px",
                    display: "block",
                  }}
                >
                  选择应用的外观主题
                </Text>
                <Segmented
                  value={settings.themeMode}
                  onChange={(value) => {
                    const newSettings = {
                      ...settings,
                      themeMode: value as "light" | "dark" | "system",
                    };
                    setSettings(newSettings);
                    saveSettingsImmediately(newSettings);
                    // 通知父组件更新主题
                    onThemeModeChange?.(value as "light" | "dark" | "system");
                  }}
                  options={[
                    {
                      label: (
                        <div style={{ padding: "4px 8px" }}>
                          <SunOutlined style={{ marginRight: 4 }} />
                          浅色
                        </div>
                      ),
                      value: "light",
                    },
                    {
                      label: (
                        <div style={{ padding: "4px 8px" }}>
                          <MoonOutlined style={{ marginRight: 4 }} />
                          深色
                        </div>
                      ),
                      value: "dark",
                    },
                    {
                      label: (
                        <div style={{ padding: "4px 8px" }}>
                          <LaptopOutlined style={{ marginRight: 4 }} />
                          跟随系统
                        </div>
                      ),
                      value: "system",
                    },
                  ]}
                  block
                />
              </div>

              <Divider style={{ margin: 0 }} />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <Text style={{ color: themeVars.text }}>开机自启动</Text>
                  <br />
                  <Text
                    type="secondary"
                    style={{ fontSize: "12px", color: themeVars.textSecondary }}
                  >
                    系统启动时自动运行应用
                  </Text>
                </div>
                <Switch
                  checked={settings.autoStart}
                  onChange={(checked) => {
                    const newSettings = { ...settings, autoStart: checked };
                    setSettings(newSettings);
                    saveSettingsImmediately(newSettings);
                  }}
                />
              </div>

              <Divider style={{ margin: 0 }} />

              <div>
                <Text style={{ color: themeVars.text, fontWeight: 500 }}>
                  Claude Code 目录
                </Text>
                <br />
                <Text
                  type="secondary"
                  style={{
                    fontSize: "12px",
                    color: themeVars.textSecondary,
                    marginBottom: "12px",
                    display: "block",
                  }}
                >
                  当前监控的 Claude Code 安装路径
                </Text>
                <Input
                  value={claudeDir}
                  readOnly
                  style={{
                    fontFamily: "monospace",
                    fontSize: 12,
                    backgroundColor: themeVars.bgSection,
                  }}
                />
              </div>

              <Divider style={{ margin: 0 }} />

              <div>
                <Text style={{ color: themeVars.text, fontWeight: 500 }}>
                  数据存储
                </Text>
                <br />
                <Text
                  type="secondary"
                  style={{
                    fontSize: "12px",
                    color: themeVars.textSecondary,
                    marginBottom: "12px",
                    display: "block",
                  }}
                >
                  你的 API Key 和设置存储在本地加密文件中（非 localStorage）
                </Text>
                <Button
                  icon={<FolderOpenOutlined />}
                  onClick={handleShowConfigPath}
                  block
                >
                  查看配置文件位置
                </Button>
              </div>
            </Space>
          </Card>

          {/* 卡片 2: Claude Code 配置 */}
          <Card
            title={
              <Space>
                <CodeOutlined style={{ color: themeVars.primary }} />
                <span>Claude Code 配置</span>
              </Space>
            }
            style={{
              backgroundColor: themeVars.bgContainer,
              borderColor: themeVars.border,
            }}
          >
            <ConfigEditor ref={configEditorRef} darkMode={darkMode} />
          </Card>

          {/* 卡片 3: 对话记录管理 */}
          <Card
            id="record-control"
            title={
              <Space>
                <PlayCircleOutlined style={{ color: themeVars.primary }} />
                <span>对话记录管理</span>
              </Space>
            }
            style={{
              backgroundColor: themeVars.bgContainer,
              borderColor: themeVars.border,
            }}
          >
            <RecordControl ref={recordControlRef} />
          </Card>

          {/* 卡片 4: AI 功能配置（Tab 切换：对话 / 总结） */}
          <AIConfigTabs
            aiChat={settings.aiChat}
            aiSummary={settings.aiSummary}
            darkMode={darkMode}
            onAIChatChange={handleAIChatChange}
            onAISummaryChange={handleAISummaryChange}
          />
        </div>

        {/* 卸载应用 - 放在最底部 */}
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            width: "100%",
            textAlign: "center",
            paddingTop: "24px",
            borderTop: `1px solid ${themeVars.borderSecondary}`,
          }}
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={handleUninstall}
            size="small"
            style={{ padding: "4px 8px" }}
          >
            卸载应用
          </Button>
        </div>

        {/* 配置文件编辑器 */}
        <ConfigFileEditor
          title="编辑应用配置文件"
          filePath={configPath}
          darkMode={darkMode}
          visible={configEditorVisible}
          onClose={() => setConfigEditorVisible(false)}
          onLoad={async () => {
            const content = await window.electronAPI.readAppConfigFile();
            return content;
          }}
          onSave={async (content: string) => {
            await window.electronAPI.saveAppConfigFile(content);
            // 重新加载设置
            await loadSettings();
            // 刷新所有组件的数据
            await Promise.all([
              configEditorRef.current?.refresh(),
              recordControlRef.current?.refresh(),
            ]);
            // 解析配置并更新主题
            try {
              const config = JSON.parse(content);
              if (config.themeMode && onThemeModeChange) {
                onThemeModeChange(config.themeMode);
              }
            } catch (error) {
              console.error("解析配置失败:", error);
            }
            message.success("配置已保存并刷新");
          }}
          onOpenFolder={async () => {
            await window.electronAPI.showConfigInFolder();
          }}
        />
      </div>
    </div>
  );
}

export default SettingsView;
