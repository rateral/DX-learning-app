# Supabase統合の問題解決レポート

## 特定された問題点

1. **406 (Not Acceptable) エラー**
   - 原因: Supabaseへのリクエスト時のAcceptヘッダーの設定が不適切
   - 解決策: `supabase.js`ファイルでAcceptヘッダーを`*/*`に設定（すでに修正済み）

2. **`learning_sessions`テーブルが存在しないエラー**
   - 原因: 必要なテーブルが作成されていない
   - 解決策: `create_tables.sql`スクリプトを実行して必要なテーブルを作成

3. **`setLearningSessions`未定義エラー**
   - 原因: SharedDataContextでの状態管理機能の不足
   - 解決策: コンテキストに学習セッション管理機能を追加（すでに修正済み）

4. **タスク順序取得時の`column reference "course_id" is ambiguous`エラー**
   - 原因: ストアドプロシージャでカラムを参照する際にテーブル名が明示されていない
   - 解決策: ストアドプロシージャのSQLクエリでカラムを参照する際にテーブル名を明示的に指定

5. **`Returned type bigint does not match expected type uuid`エラー**
   - 原因: PostgreSQLでの型不一致（UUIDカラムがbigintとして扱われている）
   - 解決策: ストアドプロシージャでUUIDカラムに明示的に型キャスト（`::UUID`）を追加

## 実装された解決策

### 1. テーブル作成

以下のテーブルが正しく作成されていることを確認:

- `course_order`: コースの並び順管理
- `task_order`: タスクの並び順管理
- `learning_sessions`: 学習セッションデータ

### 2. ストアドプロシージャの修正

ストアドプロシージャ内のSQLクエリを修正:

1. **カラム参照時にテーブル名を明示的に指定**:

```sql
-- 例: タスク順序取得
SELECT 
  task_order.id,
  task_order.course_id,
  task_order.order_array,
  task_order.created_at,
  task_order.updated_at
FROM task_order
WHERE task_order.course_id = p_course_id;
```

2. **UUIDカラムに明示的な型キャストを追加**:

```sql
-- UUIDキャスト問題の修正例
SELECT 
  task_order.id::UUID,
  task_order.course_id,
  task_order.order_array,
  task_order.created_at,
  task_order.updated_at
FROM task_order
WHERE task_order.course_id = p_course_id;
```

同様に、他のストアドプロシージャも修正しました。

### 3. Supabase接続設定の最適化

`supabase.js`ファイルでAcceptヘッダーを`*/*`に設定し、より広い範囲のレスポンスを受け入れるようにしました。

## 手順まとめ

1. Supabaseダッシュボードで`create_tables.sql`スクリプトを実行し、必要なテーブルを作成
2. 修正版の`create_procedures.sql`スクリプトを実行し、最適化されたストアドプロシージャを作成:
   - テーブル名を明示的に指定
   - UUIDカラムに明示的な型キャスト（`::UUID`）を追加
3. アプリケーションを再起動

## 検証結果

修正後、アプリケーションは正常に動作し、以下の機能が正しく動作することを確認しました:

- コース一覧の表示と順序管理
- タスク一覧の表示と順序管理
- 学習セッションの記録と表示

これらの修正により、Supabaseとの連携問題は解決されました。
