# 🔒 GitHub 分支保护设置指南

## 📋 目录

1. [为什么需要分支保护](#为什么需要分支保护)
2. [设置步骤](#设置步骤)
3. [推荐配置](#推荐配置)
4. [常见场景](#常见场景)
5. [常见问题](#常见问题)

---

## 🎯 为什么需要分支保护

### 保护 main 分支的好处

1. **防止误操作**
   - 防止直接推送未经测试的代码
   - 防止强制推送覆盖历史
   - 防止意外删除分支

2. **保证代码质量**
   - 要求通过 PR 审查
   - 要求 CI/CD 测试通过
   - 保持提交历史清晰

3. **团队协作**
   - 限制谁能推送到主分支
   - 要求代码审查
   - 记录所有变更

---

## 🚀 设置步骤

### 步骤 1: 访问分支保护设置

1. 打开浏览器，访问:
   ```
   https://github.com/zhanBoss/Claude-Code-Monitor/settings/branches
   ```

2. 或者通过导航:
   - 进入仓库主页
   - 点击 "Settings" (设置)
   - 左侧菜单点击 "Branches" (分支)

### 步骤 2: 添加分支保护规则

1. 点击 **"Add branch protection rule"** (添加分支保护规则)

2. 在 **"Branch name pattern"** 中输入:
   ```
   main
   ```

   **说明**:
   - 输入 `main` 表示保护 main 分支
   - 支持通配符，如 `release/*` 保护所有 release 分支

### 步骤 3: 配置保护规则

根据你的需求选择以下配置:

---

## ⚙️ 推荐配置

### 配置 A: 个人项目 - 基础保护 (推荐)

**适用场景**: 个人开发，偶尔有协作者

```
Branch name pattern: main

【Protect matching branches】

✅ Require a pull request before merging
   - 要求通过 PR 才能合并
   - Required approvals: 0 (个人项目不需要审批)
   - ❌ Dismiss stale pull request approvals when new commits are pushed
   - ❌ Require review from Code Owners

❌ Require status checks to pass before merging
   - 如果没有 CI/CD，不需要勾选

❌ Require conversation resolution before merging
   - 个人项目可以不勾选

❌ Require signed commits
   - 除非你配置了 GPG 密钥

✅ Require linear history
   - 保持提交历史线性，推荐勾选

❌ Require deployments to succeed before merging
   - 如果没有自动部署，不需要

❌ Lock branch
   - 不锁定分支

✅ Do not allow bypassing the above settings
   - ❌ 取消勾选 (允许管理员绕过，方便你自己操作)

❌ Allow force pushes
   - 禁止强制推送

❌ Allow deletions
   - 禁止删除分支
```

**设置后的效果**:
- ✅ 你可以直接推送到 main (作为管理员)
- ✅ 协作者必须通过 PR
- ✅ 防止强制推送和删除分支
- ✅ 保持提交历史线性

---

### 配置 B: 严格保护 - 限制推送权限

**适用场景**: 有多个协作者，需要严格控制

```
Branch name pattern: main

【Protect matching branches】

✅ Require a pull request before merging
   - Required approvals: 1 (至少需要 1 人审批)
   - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require review from Code Owners

✅ Require status checks to pass before merging
   - 勾选需要通过的检查项 (如 CI/CD)

✅ Require conversation resolution before merging
   - 要求解决所有评论

✅ Require signed commits
   - 要求签名提交 (需要配置 GPG)

✅ Require linear history
   - 保持线性历史

❌ Lock branch

✅ Do not allow bypassing the above settings
   - ✅ 勾选 (管理员也必须遵守规则)

【Restrict who can push to matching branches】
✅ Restrict pushes that create matching branches
   - 点击添加，只添加你自己的账号

❌ Allow force pushes

❌ Allow deletions
```

**设置后的效果**:
- ✅ 只有你能直接推送到 main
- ✅ 其他人必须通过 PR
- ✅ PR 需要你审批
- ✅ 所有人都必须遵守规则

---

### 配置 C: 完全开放 - 仅防止误删除

**适用场景**: 个人项目，不需要严格控制

```
Branch name pattern: main

【Protect matching branches】

❌ Require a pull request before merging

❌ Require status checks to pass before merging

❌ Require conversation resolution before merging

❌ Require signed commits

❌ Require linear history

❌ Lock branch

❌ Do not allow bypassing the above settings

❌ Allow force pushes
   - 禁止强制推送

❌ Allow deletions
   - 禁止删除分支
```

**设置后的效果**:
- ✅ 任何人都可以推送
- ✅ 防止强制推送和删除分支
- ✅ 最小限度的保护

---

## 📖 常见场景

### 场景 1: 我想直接推送，不想走 PR

**方案**: 使用配置 A，并取消勾选 "Do not allow bypassing the above settings"

**操作**:
```bash
# 你可以直接推送
git push origin main

# 协作者必须通过 PR
```

### 场景 2: 我想让所有人都必须走 PR，包括我自己

**方案**: 使用配置 B，并勾选 "Do not allow bypassing the above settings"

**操作**:
```bash
# 创建新分支
git checkout -b feature/new-feature

# 提交代码
git add .
git commit -m "feat: add new feature"

# 推送到远程
git push origin feature/new-feature

# 在 GitHub 创建 PR
gh pr create --title "Add new feature" --body "Description"

# 审批并合并
gh pr merge 1 --squash
```

### 场景 3: 我想完全禁止其他人推送

**方案**: 使用配置 B，并启用 "Restrict who can push to matching branches"

**操作**:
1. 勾选 "Restrict pushes that create matching branches"
2. 在 "People, teams, or apps with push access" 中只添加你自己
3. 其他人将无法推送，只能提交 PR

### 场景 4: 紧急情况需要强制推送

**临时解决方案**:

1. **临时关闭保护**:
   - 访问 https://github.com/zhanBoss/Claude-Code-Monitor/settings/branches
   - 点击规则右侧的 "Edit"
   - 勾选 "Allow force pushes"
   - 保存

2. **执行强制推送**:
   ```bash
   git push origin main --force
   ```

3. **恢复保护**:
   - 取消勾选 "Allow force pushes"
   - 保存

**更好的方案**: 使用 `git revert` 而不是强制推送
```bash
# 回退最近的提交
git revert HEAD

# 推送回退提交
git push origin main
```

---

## ❓ 常见问题

### Q1: 设置后我自己也无法推送了怎么办？

**原因**: 勾选了 "Do not allow bypassing the above settings"

**解决**:
1. 访问分支保护设置
2. 编辑 main 分支规则
3. 取消勾选 "Do not allow bypassing the above settings"
4. 保存

或者:
```bash
# 通过 PR 推送
git checkout -b temp-branch
git push origin temp-branch
gh pr create --fill
gh pr merge --squash
```

### Q2: 如何临时禁用分支保护？

**方法 1: 编辑规则**
1. 访问分支保护设置
2. 点击规则右侧的 "Edit"
3. 取消需要的保护项
4. 保存

**方法 2: 删除规则**
1. 访问分支保护设置
2. 点击规则右侧的 "Delete"
3. 确认删除
4. 操作完成后重新创建规则

### Q3: 协作者无法推送，提示权限错误

**错误信息**:
```
remote: error: GH006: Protected branch update failed
```

**原因**: 分支保护规则阻止了推送

**解决**:
1. 让协作者创建新分支
2. 推送到新分支
3. 创建 PR
4. 审批并合并

```bash
# 协作者操作
git checkout -b feature/xxx
git push origin feature/xxx
gh pr create
```

### Q4: 如何查看当前的分支保护规则？

**方法 1: 网页查看**
```
https://github.com/zhanBoss/Claude-Code-Monitor/settings/branches
```

**方法 2: 使用 gh CLI**
```bash
# 查看分支保护状态
gh api repos/zhanBoss/Claude-Code-Monitor/branches/main/protection

# 查看是否受保护
gh api repos/zhanBoss/Claude-Code-Monitor/branches/main --jq '.protected'
```

### Q5: 如何为多个分支设置相同的保护规则？

**使用通配符**:

```
Branch name pattern: release/*
```

这会保护所有 `release/` 开头的分支，如:
- `release/v1.0.0`
- `release/v2.0.0`
- `release/production`

### Q6: 分支保护会影响 GitHub Actions 吗？

**不会**，GitHub Actions 使用 `GITHUB_TOKEN` 可以绕过分支保护。

但如果你勾选了 "Do not allow bypassing the above settings"，需要额外配置:

```yaml
# .github/workflows/release.yml
permissions:
  contents: write  # 允许写入内容
  pull-requests: write  # 允许创建 PR
```

### Q7: 如何配置 GPG 签名提交？

**步骤**:

1. **生成 GPG 密钥**:
   ```bash
   gpg --full-generate-key
   ```

2. **查看密钥 ID**:
   ```bash
   gpg --list-secret-keys --keyid-format=long
   ```

3. **导出公钥**:
   ```bash
   gpg --armor --export YOUR_KEY_ID
   ```

4. **添加到 GitHub**:
   - 访问 https://github.com/settings/keys
   - 点击 "New GPG key"
   - 粘贴公钥

5. **配置 Git**:
   ```bash
   git config --global user.signingkey YOUR_KEY_ID
   git config --global commit.gpgsign true
   ```

6. **签名提交**:
   ```bash
   git commit -S -m "Signed commit"
   ```

### Q8: 如何撤销分支保护规则？

**完全删除**:
1. 访问 https://github.com/zhanBoss/Claude-Code-Monitor/settings/branches
2. 找到要删除的规则
3. 点击右侧的 "Delete"
4. 确认删除

**使用 gh CLI**:
```bash
# 删除分支保护
gh api -X DELETE repos/zhanBoss/Claude-Code-Monitor/branches/main/protection
```

---

## 🎯 推荐配置总结

### 个人项目（你的情况）

```
✅ Require a pull request before merging (0 approvals)
✅ Require linear history
❌ Do not allow bypassing the above settings (取消勾选)
❌ Allow force pushes
❌ Allow deletions
```

**效果**:
- 你可以直接推送
- 协作者必须通过 PR
- 防止误操作

### 团队项目

```
✅ Require a pull request before merging (1+ approvals)
✅ Require status checks to pass before merging
✅ Require conversation resolution before merging
✅ Require linear history
✅ Do not allow bypassing the above settings
✅ Restrict who can push to matching branches
❌ Allow force pushes
❌ Allow deletions
```

**效果**:
- 所有人必须通过 PR
- 需要代码审查
- 需要 CI 通过
- 严格保护

---

## 📚 相关资源

- [GitHub 分支保护文档](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub CLI 文档](https://cli.github.com/manual/)
- [GPG 签名提交指南](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits)

---

## 🆘 获取帮助

如果遇到问题:
1. 查看本文档的常见问题部分
2. 访问 GitHub 官方文档
3. 在仓库创建 Issue

---

**最后更新**: 2026-02-08
