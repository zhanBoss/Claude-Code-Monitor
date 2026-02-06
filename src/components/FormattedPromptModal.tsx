import { useState, useEffect } from "react";
import { Typography, Button, Space, message, Segmented, Spin } from "antd";
import { SwapOutlined, CopyOutlined, RobotOutlined } from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import ElectronModal from "./ElectronModal";
import { getThemeVars } from "../theme";
import crypto from "crypto-js";

const { Text } = Typography;

interface FormattedPromptModalProps {
  visible: boolean;
  onClose: () => void;
  content: string;
  darkMode: boolean;
  title?: string;
}

type ViewMode = "original" | "formatted";

/**
 * 格式化 Prompt 详情弹窗组件
 *
 * 功能:
 * - 显示原始内容和 AI 格式化后的 Markdown 版本
 * - 支持切换视图
 * - 懒加载格式化（打开弹窗时才调用 AI）
 * - 缓存格式化结果
 * - 失败时自动降级到原始视图
 */
function FormattedPromptModal({
  visible,
  onClose,
  content,
  darkMode,
  title = "Prompt 详情",
}: FormattedPromptModalProps) {
  const themeVars = getThemeVars(darkMode);

  const [viewMode, setViewMode] = useState<ViewMode>("original");
  const [formattedContent, setFormattedContent] = useState<string>("");
  const [formatting, setFormatting] = useState(false);
  const [formatError, setFormatError] = useState<string>("");

  // 计算内容 hash（用于缓存）
  const contentHash = crypto.MD5(content).toString();

  // 弹窗打开时尝试格式化
  useEffect(() => {
    if (!visible) return;

    const tryFormat = async () => {
      setFormatting(true);
      setFormatError("");

      try {
        const result = await window.electronAPI.formatPrompt(
          content,
          contentHash,
        );

        if (result.success && result.formatted) {
          setFormattedContent(result.formatted);
        } else {
          setFormatError(result.error || "格式化失败");
          setViewMode("original"); // 失败时降级到原始视图
        }
      } catch (error: any) {
        setFormatError(error.message || "格式化失败");
        setViewMode("original");
      } finally {
        setFormatting(false);
      }
    };

    tryFormat();
  }, [visible, content, contentHash]);

  // 复制内容
  const handleCopy = async () => {
    const textToCopy = viewMode === "formatted" ? formattedContent : content;
    try {
      await window.electronAPI.copyToClipboard(textToCopy);
      message.success("已复制到剪贴板");
    } catch (error) {
      message.error("复制失败");
    }
  };

  // 渲染原始内容
  const renderOriginalContent = () => (
    <div
      style={{
        padding: "16px",
        background: themeVars.bgElevated,
        borderRadius: 8,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        fontSize: 14,
        lineHeight: 1.6,
        color: themeVars.text,
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
      }}
    >
      {content}
    </div>
  );

  // 渲染格式化后的 Markdown
  const renderFormattedContent = () => {
    if (formatting) {
      return (
        <div
          style={{
            padding: "48px",
            textAlign: "center",
            background: themeVars.bgElevated,
            borderRadius: 8,
          }}
        >
          <Spin size="large" />
          <div
            style={{
              marginTop: 16,
              fontSize: 14,
              color: themeVars.textSecondary,
            }}
          >
            <RobotOutlined style={{ marginRight: 6 }} />
            AI 正在格式化内容...
          </div>
        </div>
      );
    }

    if (formatError) {
      return (
        <div
          style={{
            padding: "32px",
            textAlign: "center",
            background: themeVars.bgElevated,
            borderRadius: 8,
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: themeVars.textTertiary,
              marginBottom: 8,
            }}
          >
            格式化失败: {formatError}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            已自动切换到原始视图
          </Text>
        </div>
      );
    }

    if (!formattedContent) {
      return renderOriginalContent();
    }

    return (
      <div
        style={{
          padding: "16px 20px",
          background: themeVars.bgElevated,
          borderRadius: 8,
          fontSize: 14,
          lineHeight: 1.7,
          color: themeVars.text,
        }}
      >
        <ReactMarkdown
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || "");
              return !inline && match ? (
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    margin: "12px 0",
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                  showLineNumbers
                  {...props}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              ) : (
                <code
                  style={{
                    background: themeVars.codeBg,
                    padding: "2px 6px",
                    borderRadius: 3,
                    fontSize: 13,
                    fontFamily: "monospace",
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            },
            p({ children }) {
              return (
                <p style={{ marginBottom: 12, lineHeight: 1.7 }}>{children}</p>
              );
            },
            h1({ children }) {
              return (
                <h1
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    marginBottom: 16,
                    marginTop: 24,
                  }}
                >
                  {children}
                </h1>
              );
            },
            h2({ children }) {
              return (
                <h2
                  style={{
                    fontSize: 19,
                    fontWeight: 600,
                    marginBottom: 14,
                    marginTop: 20,
                  }}
                >
                  {children}
                </h2>
              );
            },
            h3({ children }) {
              return (
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    marginBottom: 12,
                    marginTop: 16,
                  }}
                >
                  {children}
                </h3>
              );
            },
            ul({ children }) {
              return (
                <ul style={{ marginBottom: 12, paddingLeft: 24 }}>
                  {children}
                </ul>
              );
            },
            ol({ children }) {
              return (
                <ol style={{ marginBottom: 12, paddingLeft: 24 }}>
                  {children}
                </ol>
              );
            },
            li({ children }) {
              return <li style={{ marginBottom: 6 }}>{children}</li>;
            },
            pre({ children }) {
              return <>{children}</>;
            },
            blockquote({ children }) {
              return (
                <blockquote
                  style={{
                    borderLeft: `3px solid ${themeVars.primary}`,
                    paddingLeft: 16,
                    marginLeft: 0,
                    marginBottom: 12,
                    color: themeVars.textSecondary,
                  }}
                >
                  {children}
                </blockquote>
              );
            },
          }}
        >
          {formattedContent}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <ElectronModal
      title={
        <Space>
          <Text>{title}</Text>
          {formattedContent && (
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
              (AI 格式化)
            </Text>
          )}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      styles={{
        body: {
          maxHeight: "70vh",
          overflow: "auto",
        } as React.CSSProperties,
      }}
      footer={
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* 左侧：视图切换 */}
          {formattedContent && !formatting && !formatError && (
            <Segmented
              value={viewMode}
              onChange={(val) => setViewMode(val as ViewMode)}
              options={[
                {
                  label: "原始内容",
                  value: "original",
                  icon: <SwapOutlined />,
                },
                {
                  label: "AI 格式化",
                  value: "formatted",
                  icon: <RobotOutlined />,
                },
              ]}
            />
          )}
          {(!formattedContent || formatting || formatError) && <div />}

          {/* 右侧：操作按钮 */}
          <Space>
            <Button icon={<CopyOutlined />} onClick={handleCopy}>
              复制
            </Button>
            <Button type="primary" onClick={onClose}>
              关闭
            </Button>
          </Space>
        </div>
      }
    >
      {viewMode === "original"
        ? renderOriginalContent()
        : renderFormattedContent()}
    </ElectronModal>
  );
}

export default FormattedPromptModal;
