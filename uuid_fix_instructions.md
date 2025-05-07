# 最終修正：UUID型変換の問題を解決

## 発生した問題

アプリケーションの実行中に以下のエラーが継続的に発生していました：

```
タスク順序RPC呼び出しエラー: {
  code: '42846', 
  details: null, 
  hint: null, 
  message: 'cannot cast type bigint to uuid'
}
```

このエラーは、PostgreSQL（Supabase）において、bigint型をUUID型に直接キャストできないことが原因です。

## 解決方法

PostgreSQLでは、型変換の互換性に制限があります。bigint型からUUID型への直接変換は許可されていないため、一度中間型（TEXT）を経由した2段階の変換が必要です。

### 修正したストアドプロシージャ

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
    (task_order.id)::TEXT::UUID,  -- 2段階のキャスト
    task_order.course_id,
    task_order.order_array,
    task_order.created_at,
    task_order.updated_at
  FROM task_order
  WHERE task_order.course_id = p_course_id;
END;
$$ LANGUAGE plpgsql;
```

同様の修正を他のストアドプロシージャにも適用しています。

## 適用手順

1. Supabaseのダッシュボード（https://app.supabase.io）にログインする
2. プロジェクトを選択し、「SQL Editor」を開く
3. `create_procedures.sql`ファイルの内容をコピーしてエディタに貼り付ける
4. 「Run」ボタンをクリックして実行する
5. アプリケーションを再起動（または再読み込み）する

## 技術的な説明

PostgreSQLの型システムでは、互換性のない型間の自動変換には制限があります。UUIDは特殊な形式を持つ文字列ですが、bigintは数値型のため、直接的な変換が許可されていません。

この問題を解決するには：

1. まず値をテキスト（文字列）に変換：`(id)::TEXT`
2. その後、テキストをUUID形式に変換：`::UUID`

これにより、PostgreSQLは値をまず文字列として扱い、その後に文字列がUUIDの形式に適合するかを検証して変換することができます。

## 注意事項

この修正を適用した後、アプリケーションを再起動してエラーが解消されることを確認してください。問題が継続する場合は、ブラウザのコンソールに新しいエラーメッセージが表示されているかを確認し、対応する必要があります。
