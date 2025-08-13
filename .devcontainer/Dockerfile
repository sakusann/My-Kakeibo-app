# ベースとなるNode.js環境を指定
FROM mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm

# すべてのインストールと設定を一つのRUNコマンドにまとめる
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    # 1. 必要な基本ツールをインストール
    && apt-get -y install --no-install-recommends \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    # 2. Dockerリポジトリのセットアップ
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
    $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    # 3. Google Cloudリポジトリのセットアップ
    && echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list \
    && curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key --keyring /usr/share/keyrings/cloud.google.gpg add - \
    # 4. リポジトリ情報を再度更新し、CLIツールをインストール
    && apt-get update \
    && apt-get -y install \
    docker-ce-cli \
    google-cloud-sdk \
    # --- ▼▼▼【ここが最重要修正点】▼▼▼ ---
    # 5. dockerグループが存在しなければ作成し、一般ユーザー(node)をそのグループに追加する
    #    `groupadd docker || true` は、もしグループが既に存在していてもエラーにしないおまじない
    && groupadd docker || true \
    && usermod -aG docker node \
    # --- ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ ---
    # 6. aptキャッシュを削除してイメージサイズを削減
    && rm -rf /var/lib/apt/lists/*

# Firebase CLI と Gemini CLI をnpmでインストール (一般ユーザー'node'として実行)
RUN su node -c "npm install -g firebase-tools @google/gemini-cli"