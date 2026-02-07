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
  RobotOutlined,
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
    // AI 总结配置
    aiSummary: {
      enabled: false,
      provider: "groq",
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
  });
  const [configEditorVisible, setConfigEditorVisible] = useState(false);
  const [configPath, setConfigPath] = useState("");
  const [activeSection, setActiveSection] = useState("general");
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

  // ConfigEditor 的 ref，用于刷新数据
  const configEditorRef = useRef<ConfigEditorRef>(null);
  // RecordControl 的 ref，用于刷新数据
  const recordControlRef = useRef<RecordControlRef>(null);
  // 内容区域的 ref，用于滚动监听
  const contentRef = useRef<HTMLDivElement>(null);
  // 标记是否为点击导航触发的滚动（用于区分点击导航和自然滚动）
  const isClickScrolling = useRef(false);

  const themeVars = getThemeVars(darkMode);

  // 导航项配置
  const navItems = [
    { id: "general", label: "通用", icon: <BulbOutlined /> },
    { id: "claude-config", label: "Claude Code", icon: <CodeOutlined /> },
    { id: "record-control", label: "对话记录", icon: <PlayCircleOutlined /> },
    { id: "ai-config", label: "AI 功能", icon: <RobotOutlined /> },
  ];

  // 滚动监听，更新激活的导航项
  useEffect(() => {
    const handleScroll = () => {
      // 如果是点击导航触发的滚动，忽略本次监听
      if (isClickScrolling.current) {
        return;
      }

      if (!contentRef.current) return;

      const scrollTop = contentRef.current.scrollTop;
      const sections = navItems
        .map((item) => {
          const element = document.getElementById(item.id);
          if (!element) return null;

          const rect = element.getBoundingClientRect();
          const containerRect = contentRef.current!.getBoundingClientRect();
          const relativeTop = rect.top - containerRect.top + scrollTop;

          return {
            id: item.id,
            top: relativeTop,
            bottom: relativeTop + rect.height,
          };
        })
        .filter(Boolean);

      // 找到当前滚动位置对应的 section（考虑 150px 的偏移量）
      const currentScrollPos = scrollTop + 150;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && currentScrollPos >= section.top) {
          setActiveSection(section.id);
          break;
        }
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener("scroll", handleScroll);
      // 初始化时执行一次
      setTimeout(handleScroll, 100);
    }

    return () => {
      if (contentElement) {
        contentElement.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  // 点击导航项，滚动到对应区域
  const handleNavClick = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element && contentRef.current) {
      // 标记为点击导航触发的滚动，禁用滚动监听
      isClickScrolling.current = true;

      // 立即更新激活状态（一步到位）
      setActiveSection(sectionId);

      const containerRect = contentRef.current.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const scrollTop = contentRef.current.scrollTop;
      const offset = 100; // 顶部偏移量
      const targetScrollTop =
        scrollTop + elementRect.top - containerRect.top - offset;

      contentRef.current.scrollTo({
        top: targetScrollTop,
        behavior: "smooth",
      });

      // 滚动结束后，重新启用滚动监听
      // 使用 setTimeout 来等待 smooth 滚动完成（约 500-800ms）
      setTimeout(() => {
        isClickScrolling.current = false;
      }, 800);
    }
  };

  // 处理滚动到指定区域
  useEffect(() => {
    if (scrollToSection) {
      const timer = setTimeout(() => {
        const element = document.getElementById(scrollToSection);
        if (element) {
          // 标记为点击导航触发的滚动，禁用滚动监听
          isClickScrolling.current = true;

          // 立即更新激活状态
          setActiveSection(scrollToSection);

          element.scrollIntoView({ behavior: "smooth", block: "center" });
          // 添加高亮效果
          element.style.transition = "box-shadow 0.3s ease";
          element.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.3)";
          setTimeout(() => {
            element.style.boxShadow = "";
          }, 2000);

          // 滚动结束后，重新启用滚动监听
          setTimeout(() => {
            isClickScrolling.current = false;
          }, 800);
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
        ref={contentRef}
        style={{
          flex: 1,
          overflow: "auto",
          padding: "32px",
          position: "relative",
        }}
      >
        {/* 右上角浮动导航栏 - 高透明度设计 */}
        <div
          style={{
            position: "fixed",
            top: 80,
            right: 32,
            zIndex: 100,
            backgroundColor: darkMode
              ? "rgba(20, 20, 20, 0.3)"
              : "rgba(255, 255, 255, 0.3)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderRadius: 12,
            padding: "8px",
            border: darkMode
              ? "1px solid rgba(255, 255, 255, 0.1)"
              : "1px solid rgba(0, 0, 0, 0.08)",
            boxShadow: darkMode
              ? "0 4px 16px rgba(0, 0, 0, 0.3)"
              : "0 4px 16px rgba(0, 0, 0, 0.08)",
            transition: "all 0.3s ease",
            minWidth: 140,
          }}
        >
          {navItems.map((item, index) => {
            const isActive = activeSection === item.id;
            const isHovered = hoveredSection === item.id;
            const shouldHighlight = isHovered || isActive;

            return (
              <div
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                  marginBottom: index === navItems.length - 1 ? 0 : 4,
                  backgroundColor: shouldHighlight
                    ? darkMode
                      ? "rgba(255, 255, 255, 0.15)"
                      : "rgba(0, 0, 0, 0.08)"
                    : "transparent",
                  color: shouldHighlight
                    ? themeVars.primary
                    : darkMode
                      ? "rgba(255, 255, 255, 0.5)"
                      : "rgba(0, 0, 0, 0.45)",
                  transition: "all 0.2s ease",
                  fontSize: 13,
                  fontWeight: shouldHighlight ? 600 : 400,
                  transform: shouldHighlight
                    ? "translateX(-2px)"
                    : "translateX(0)",
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    opacity: shouldHighlight ? 1 : 0.6,
                    transition: "opacity 0.2s ease",
                  }}
                >
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {shouldHighlight && (
                  <span
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      backgroundColor: themeVars.primary,
                      boxShadow: `0 0 6px ${themeVars.primary}`,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(420px, 100%), 1fr))",
            gap: "20px",
            maxWidth: "1400px",
            margin: "0 auto",
            paddingBottom: "32px",
            width: "100%",
          }}
        >
          {/* 卡片 1: 通用设置 */}
          <Card
            id="general"
            onMouseEnter={() => setHoveredSection("general")}
            onMouseLeave={() => setHoveredSection(null)}
            title={
              <Space size={10}>
                <BulbOutlined
                  style={{ color: themeVars.primary, fontSize: 18 }}
                />
                <span style={{ fontSize: 15, fontWeight: 600 }}>通用设置</span>
              </Space>
            }
            style={{
              backgroundColor: themeVars.bgContainer,
              borderColor: themeVars.border,
              borderRadius: 12,
              boxShadow: darkMode
                ? "0 2px 8px rgba(0, 0, 0, 0.15)"
                : "0 2px 8px rgba(0, 0, 0, 0.06)",
              transition: "all 0.3s ease",
            }}
            styles={{
              header: {
                borderBottom: `1px solid ${themeVars.borderSecondary}`,
                padding: "16px 20px",
              },
              body: {
                padding: "20px",
              },
            }}
          >
            <Space direction="vertical" size={20} style={{ width: "100%" }}>
              <div>
                <Text
                  style={{
                    color: themeVars.text,
                    fontWeight: 500,
                    fontSize: 14,
                  }}
                >
                  外观主题
                </Text>
                <br />
                <Text
                  type="secondary"
                  style={{
                    fontSize: 13,
                    color: themeVars.textSecondary,
                    marginTop: 4,
                    marginBottom: 12,
                    display: "block",
                    lineHeight: 1.5,
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

              <Divider style={{ margin: "4px 0" }} />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <Text
                    style={{
                      color: themeVars.text,
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    开机自启动
                  </Text>
                  <br />
                  <Text
                    type="secondary"
                    style={{
                      fontSize: 13,
                      color: themeVars.textSecondary,
                      lineHeight: 1.5,
                    }}
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

              <Divider style={{ margin: "4px 0" }} />

              <div>
                <Text
                  style={{
                    color: themeVars.text,
                    fontWeight: 500,
                    fontSize: 14,
                  }}
                >
                  Claude Code 目录
                </Text>
                <br />
                <Text
                  type="secondary"
                  style={{
                    fontSize: 13,
                    color: themeVars.textSecondary,
                    marginTop: 4,
                    marginBottom: 12,
                    display: "block",
                    lineHeight: 1.5,
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

              <Divider style={{ margin: "4px 0" }} />

              <div>
                <Text
                  style={{
                    color: themeVars.text,
                    fontWeight: 500,
                    fontSize: 14,
                  }}
                >
                  数据存储
                </Text>
                <br />
                <Text
                  type="secondary"
                  style={{
                    fontSize: 13,
                    color: themeVars.textSecondary,
                    marginTop: 4,
                    marginBottom: 12,
                    display: "block",
                    lineHeight: 1.5,
                  }}
                >
                  你的 API Key 和设置存储在本地加密文件中
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
            id="claude-config"
            onMouseEnter={() => setHoveredSection("claude-config")}
            onMouseLeave={() => setHoveredSection(null)}
            title={
              <Space size={10}>
                <CodeOutlined
                  style={{ color: themeVars.primary, fontSize: 18 }}
                />
                <span style={{ fontSize: 15, fontWeight: 600 }}>
                  Claude Code 配置
                </span>
              </Space>
            }
            style={{
              backgroundColor: themeVars.bgContainer,
              borderColor: themeVars.border,
              borderRadius: 12,
              boxShadow: darkMode
                ? "0 2px 8px rgba(0, 0, 0, 0.15)"
                : "0 2px 8px rgba(0, 0, 0, 0.06)",
              transition: "all 0.3s ease",
            }}
            styles={{
              header: {
                borderBottom: `1px solid ${themeVars.borderSecondary}`,
                padding: "16px 20px",
              },
              body: {
                padding: "20px",
              },
            }}
          >
            <ConfigEditor ref={configEditorRef} darkMode={darkMode} />
          </Card>

          {/* 卡片 3: 对话记录管理 */}
          <Card
            id="record-control"
            onMouseEnter={() => setHoveredSection("record-control")}
            onMouseLeave={() => setHoveredSection(null)}
            title={
              <Space size={10}>
                <PlayCircleOutlined
                  style={{ color: themeVars.primary, fontSize: 18 }}
                />
                <span style={{ fontSize: 15, fontWeight: 600 }}>
                  对话记录管理
                </span>
              </Space>
            }
            style={{
              backgroundColor: themeVars.bgContainer,
              borderColor: themeVars.border,
              borderRadius: 12,
              boxShadow: darkMode
                ? "0 2px 8px rgba(0, 0, 0, 0.15)"
                : "0 2px 8px rgba(0, 0, 0, 0.06)",
              transition: "all 0.3s ease",
            }}
            styles={{
              header: {
                borderBottom: `1px solid ${themeVars.borderSecondary}`,
                padding: "16px 20px",
              },
              body: {
                padding: "20px",
              },
            }}
          >
            <RecordControl ref={recordControlRef} />
          </Card>

          {/* 卡片 4: AI 功能配置（Tab 切换：对话 / 总结） */}
          <div
            id="ai-config"
            onMouseEnter={() => setHoveredSection("ai-config")}
            onMouseLeave={() => setHoveredSection(null)}
          >
            <AIConfigTabs
              aiChat={settings.aiChat}
              aiSummary={settings.aiSummary}
              darkMode={darkMode}
              onAIChatChange={handleAIChatChange}
              onAISummaryChange={handleAISummaryChange}
            />
          </div>
        </div>

        {/* 卸载应用 - 放在最底部 */}
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            width: "100%",
            textAlign: "center",
            paddingTop: "32px",
            marginTop: "12px",
            borderTop: `1px solid ${themeVars.borderSecondary}`,
          }}
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={handleUninstall}
            size="middle"
            style={{
              padding: "6px 16px",
              fontSize: 13,
              height: 36,
            }}
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
