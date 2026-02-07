import { useState, useEffect } from "react";
import { Button, Space, message, Spin } from "antd";
import { CopyOutlined, RobotOutlined } from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import ElectronModal from "./ElectronModal";
import { getThemeVars } from "../theme";
import SmartContent from "./SmartContent";
import crypto from "crypto-js";

interface FormattedPromptModalProps {
  visible: boolean;
  onClose: () => void;
  content: string;
  darkMode: boolean;
  title?: string;
  images?: string[]; // 图片路径数组
  onImageClick?: (imageNumber: number) => void; // 图片点击回调
}

/**
 * 格式化 Prompt 详情弹窗组件
 *
 * 功能:
 * - 自动尝试 AI 格式化，成功则显示 Markdown 视图
 * - 失败时自动降级显示原始内容
 * - 无需用户配置，无需手动切换
 */
function FormattedPromptModal({
  visible,
  onClose,
  content,
  darkMode,
  title = "Prompt 详情",
  images,
  onImageClick,
}: FormattedPromptModalProps) {
  const themeVars = getThemeVars(darkMode);

  const [formattedContent, setFormattedContent] = useState<string>("");
  const [formatting, setFormatting] = useState(false);

  // 计算内容 hash（用于缓存）
  const contentHash = crypto.MD5(content).toString();

  // 弹窗打开时自动尝试格式化
  useEffect(() => {
    if (!visible) return;

    const tryFormat = async () => {
      setFormatting(true);
      setFormattedContent(""); // 重置状态

      try {
        const result = await window.electronAPI.formatPrompt(
          content,
          contentHash,
        );

        if (result.success && result.formatted) {
          setFormattedContent(result.formatted);
        }
        // 失败时不设置 formattedContent，自动显示原始内容
      } catch (error) {
        // 静默失败，显示原始内容
        console.warn("AI 格式化失败:", error);
      } finally {
        setFormatting(false);
      }
    };

    tryFormat();
  }, [visible, content, contentHash]);

  // 复制内容（优先复制格式化后的）
  const handleCopy = async () => {
    const textToCopy = formattedContent || content;
    try {
      await window.electronAPI.copyToClipboard(textToCopy);
      message.success("已复制到剪贴板");
    } catch (error) {
      message.error("复制失败");
    }
  };

  // 渲染格式化后的 Markdown（或加载中/原始内容）
  const renderContent = () => {
    // 正在格式化
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

    // 格式化成功，显示 Markdown
    if (formattedContent) {
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
    }

    // 格式化失败或未格式化，显示原始内容（使用 SmartContent 支持图片点击）
    return (
      <div
        style={{
          padding: "16px",
          background: themeVars.bgElevated,
          borderRadius: 8,
        }}
      >
        <SmartContent
          content={content}
          darkMode={darkMode}
          images={images}
          onImageClick={onImageClick}
        />
      </div>
    );
  };

  return (
    <ElectronModal
      title={title}
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
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
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
      {renderContent()}
    </ElectronModal>
  );
}

export default FormattedPromptModal;
