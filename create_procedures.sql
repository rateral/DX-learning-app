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