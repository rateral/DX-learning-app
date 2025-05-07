# 学習進捗管理アプリのセットアップ手順

## 1. Supabaseでのテーブル作成

Supabaseダッシュボードにログインし、SQL Editorで以下のSQLコマンドを実行します。

```sql
-- コース順序テーブル
CREATE TABLE IF NOT EXISTS course_order (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_array JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- タスク順序テーブル
CREATE TABLE IF NOT EXISTS task_order (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id TEXT NOT NULL,
  order_array JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 学習セッションテーブル
CREATE TABLE IF NOT EXISTS learning_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  date DATE NOT NULL,
  duration INTEGER NOT NULL,
  course_id TEXT,
  task_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_task_order_course_id ON task_order(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_user_id ON learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_date ON learning_sessions(date);
```

## 2. ストアドプロシージャの作成

同じくSQL Editorで以下のSQLコマンドを実行して、必要なストアドプロシージャを作成します。

```sql
-- タスク順序を取得するストアドプロシージャ
CREATE OR REPLACE FUNCTION get_task_order_by_course(p_course_id TEXT)
RETURNS TABLE (
  id UUID,
  course_id TEXT,
  order_array JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (task_order.id)::TEXT::UUID,
    task_order.course_id,
    task_order.order_array,
    task_order.created_at,
    task_order.updated_at
  FROM task_order
  WHERE task_order.course_id = p_course_id;
END;
$$ LANGUAGE plpgsql;

-- コース順序を取得するストアドプロシージャ
CREATE OR REPLACE FUNCTION get_course_order()
RETURNS TABLE (
  id UUID,
  order_array JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (course_order.id)::TEXT::UUID,
    course_order.order_array,
    course_order.created_at,
    course_order.updated_at
  FROM course_order;
END;
$$ LANGUAGE plpgsql;

-- 学習セッションを取得するストアドプロシージャ
CREATE OR REPLACE FUNCTION get_learning_sessions()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  date DATE,
  duration INTEGER,
  course_id TEXT,
  task_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (learning_sessions.id)::TEXT::UUID,
    COALESCE((learning_sessions.user_id)::TEXT::UUID, NULL),
    learning_sessions.date,
    learning_sessions.duration,
    learning_sessions.course_id,
    learning_sessions.task_id,
    learning_sessions.notes,
    learning_sessions.created_at
  FROM learning_sessions
  ORDER BY learning_sessions.date DESC;
EXCEPTION
  WHEN undefined_table THEN
    -- テーブルが存在しない場合は空の結果を返す
    RETURN;
END;
$$ LANGUAGE plpgsql;
```

## 3. ストアドプロシージャのテスト

Supabaseダッシュボードの「API Docs」から、作成したRPC関数をテストできます。

1. APIドキュメントを開き、「rpc」セクションに移動します
2. `get_task_order_by_course`、`get_course_order`、および`get_learning_sessions`関数が表示されていることを確認します
3. 各関数を展開し、「Try it out」ボタンをクリックして機能をテストできます

## 4. アプリケーションの更新と再起動

コード修正後、以下の手順でアプリケーションを再起動します：

```bash
# プロジェクトディレクトリに移動
cd /path/to/learning-progress-app

# 依存関係をインストール（初回のみ）
npm install

# アプリケーションを起動
npm start
```

## 5. トラブルシューティング

アプリケーション実行中に問題が発生した場合は、以下を確認してください：

1. Supabaseの接続設定が正しいか（src/supabase.jsファイル）
2. 全てのテーブルとストアドプロシージャが正しく作成されているか
3. ブラウザのコンソールでエラーが表示されていないか

エラーメッセージが表示された場合は、その内容に基づいて対応してください。一般的な問題には以下があります：

- 406 (Not Acceptable)エラー: `Accept`ヘッダーの設定問題
- テーブルが見つからないエラー: 対応するテーブルが作成されていない
- RPC関数が見つからないエラー: ストアドプロシージャが正しく作成されていない
- `column reference "course_id" is ambiguous`エラー: テーブル名を明示的に指定する必要があります
- `cannot cast type bigint to uuid`エラー: 一度テキスト型に変換してからUUIDにキャストする必要があります

以上の手順を実行することで、アプリケーションは正常に動作するはずです。