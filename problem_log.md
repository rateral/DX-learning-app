# 問題分析ログ：UUID型エラー

## エラーメッセージ

エラーコンソールで以下のエラーが繰り返し表示されています:

```
タスク順序RPC呼び出しエラー: {
  code: '42804', 
  details: 'Returned type bigint does not match expected type uuid in column 1.', 
  hint: null, 
  message: 'structure of query does not match function result type'
}
```

修正後、エラーが以下のように変わりました:

```
タスク順序RPC呼び出しエラー: {
  code: '42846', 
  details: null, 
  hint: null, 
  message: 'cannot cast type bigint to uuid'
}
```

## 原因

このエラーは、ストアドプロシージャ（RPC関数）が期待する戻り値の型と、実際にクエリから返された型の不一致が原因です。特に、テーブルの `id` フィールドがUUID型として定義されていますが、実際のデータベースクエリの結果がbigint型として返されています。

PostgreSQLでは、テーブル定義で型が正しく指定されていても、クエリの結果を関数の戻り値として使用する際に、明示的な型キャストが必要な場合があります。

最初の修正では単純なキャスト（`::UUID`）を試みましたが、PostgreSQLはbigint型からUUID型への直接的なキャストを許可していないため、エラーが変わりました。

## 解決策

より堅牢な型変換を行うために、一度テキスト（TEXT）型に変換してから、UUIDに変換するという2段階のキャストを適用します：

1. `task_order.id::UUID` から `(task_order.id)::TEXT::UUID` に変更
2. `course_order.id::UUID` から `(course_order.id)::TEXT::UUID` に変更
3. `learning_sessions.id::UUID` から `(learning_sessions.id)::TEXT::UUID` に変更
4. `learning_sessions.user_id::UUID` から `COALESCE((learning_sessions.user_id)::TEXT::UUID, NULL)` に変更（NULLの場合を考慮）

この方法では、まず値をテキスト表現に変換し、その後そのテキストをUUID型に変換します。これにより、PostgreSQLの型システムの制限を回避できます。

## 修正例

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
    (task_order.id)::TEXT::UUID,  -- 2段階の型キャストを追加
    task_order.course_id,
    task_order.order_array,
    task_order.created_at,
    task_order.updated_at
  FROM task_order
  WHERE task_order.course_id = p_course_id;
END;
$$ LANGUAGE plpgsql;
```

## 修正後の動作確認

2段階のキャストを適用したストアドプロシージャをデータベースに適用することで、型変換の問題が解決され、アプリケーションが正常に動作するようになるはずです。
