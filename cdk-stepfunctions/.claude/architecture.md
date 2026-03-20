# システム概要

「感情分析システム」の構築

- 感情分析の⾃然⾔語解析には Amazon Comprehend を利用する
- 感情分析（Sentiment Analysis）の API を利用する
- ユーザーがファイルをアップロード、ダウンロードする用の S3 バケットを使⽤
- 感情分析で使う⼊⼒ファイルがバケットにアップロード（PUT）されたことをトリガーとして、感情分析のワークフローが実⾏される。
- JSON 形式ファイルを⼊⼒⽤ S3 バケットにアップロードする。
- 分析処理の実行
- その結果を出⼒ファイルとして S3 バケットに出⼒する
- 感情分析の結果のメール通知（処理の成功と失敗を利⽤者に通知する）

---

## 詳細仕様

### 1. 入力ファイル

- 形式：JSON（単一テキスト）
  ```json
  { "text": "..." }
  ```
- 言語：日本語のみ（Comprehend に `LanguageCode: "ja"` を指定）

### 2. S3 バケット

- 入力バケット・出力バケットは**別バケット**
- 出力ファイルの命名規則：`result-{input-filename}.json`

### 3. トリガー

- S3 PUT イベントを **EventBridge ルール経由**で検知し、Step Functions を起動する

### 4. Step Functions ワークフロー

```
S3 PUT
  → EventBridge
    → Step Functions 開始
        → Lambda（Comprehend呼び出し）
             ↓ 成功                   ↓ 失敗（Retry 3回 → Catch）
         結果をS3出力             SNS通知（失敗）
         SNS通知（成功）
```

- Comprehend の呼び出しは **Lambda 経由**
- Step Functions から Lambda を直接呼び出す（SDK Integration ではなく Lambda Integration）

### 5. エラーハンドリング

| 設定                       | 内容                                                             |
| -------------------------- | ---------------------------------------------------------------- |
| Retry                      | Lambda 失敗時に最大 3 回リトライ（間隔 2 秒、指数バックオフ ×2） |
| Catch                      | 全リトライ失敗後に SNS 通知ステートに遷移                        |
| Lambda タイムアウト        | 30 秒                                                            |
| State Machine タイムアウト | 5 分                                                             |

### 6. メール通知

- サービス：**SNS**
- 成功・失敗の両方を通知
- 通知先メールアドレスは手動で設定（CDK では管理しない）

### 7. コード構成

- **Construct クラスとして分離**するパターンを採用
- S3/EventBridge/Lambda/SFn/SNS は `sentiment-analysis.ts` に**まとめて記述**（密結合のため分離しない）
- Lambda のコードのみ `lib/lambda/` に分離（実行環境が異なるため）

```
cdk-stepfunctions/
├── bin/
│   └── cdk-stepfunctions.ts          # CDKアプリのエントリーポイント
├── lib/
│   ├── cdk-stepfunctions-stack.ts    # スタック（Constructを呼び出すだけ）
│   ├── constructs/
│   │   └── sentiment-analysis.ts     # メインConstruct（S3/EventBridge/Lambda/SFn/SNS）
│   └── lambda/
│       └── sentiment/
│           └── index.ts              # Comprehendを呼ぶLambda関数
├── test/
│   └── cdk-stepfunctions.test.ts     # テスト
├── .claude/
│   └── architecture.md              # 仕様書
├── cdk.json
├── package.json
└── tsconfig.json
```
