-- =============================================
-- SIMPLE MESSAGING RPC FUNCTIONS
-- Using real staff members only - NO MOCK DATA
-- =============================================

-- Function 1: Send a message
CREATE OR REPLACE FUNCTION public.send_message(
  p_conversation_id UUID,
  p_content TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message_id UUID;
  v_sender_id UUID;
BEGIN
  -- Get current user ID
  v_sender_id := auth.uid();
  
  -- Validate user is authenticated
  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not authenticated',
      'data', null,
      'error_code', 'AUTH_REQUIRED'
    );
  END IF;
  
  -- Validate user is in staff_shared table
  IF NOT EXISTS (SELECT 1 FROM public.staff_shared WHERE user_id = v_sender_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not found in staff',
      'data', null,
      'error_code', 'STAFF_NOT_FOUND'
    );
  END IF;
  
  -- Validate conversation exists and user is participant
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = p_conversation_id 
    AND participant_id = v_sender_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not participant in conversation',
      'data', null,
      'error_code', 'NOT_PARTICIPANT'
    );
  END IF;
  
  -- Insert message
  INSERT INTO public.messages (conversation_id, sender_id, content)
  VALUES (p_conversation_id, v_sender_id, p_content)
  RETURNING id INTO v_message_id;
  
  -- Update conversation updated_at
  UPDATE public.conversations 
  SET updated_at = NOW() 
  WHERE id = p_conversation_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Message sent successfully',
    'data', jsonb_build_object('message_id', v_message_id),
    'error_code', null
  );
END;
$$;

-- Function 2: Get messages for a conversation
CREATE OR REPLACE FUNCTION public.get_messages(
  p_conversation_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_messages JSONB;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not authenticated',
      'data', null,
      'error_code', 'AUTH_REQUIRED'
    );
  END IF;
  
  -- Validate user is participant in conversation
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = p_conversation_id 
    AND participant_id = v_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not participant in conversation',
      'data', null,
      'error_code', 'NOT_PARTICIPANT'
    );
  END IF;
  
  -- Get messages with sender info
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'content', m.content,
      'sender_id', m.sender_id,
      'sender_name', s.full_name,
      'created_at', m.created_at,
      'read_by', m.read_by
    ) ORDER BY m.created_at DESC
  )
  INTO v_messages
  FROM public.messages m
  JOIN public.staff_shared s ON s.user_id = m.sender_id
  WHERE m.conversation_id = p_conversation_id
  LIMIT p_limit;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Messages retrieved successfully',
    'data', COALESCE(v_messages, '[]'::jsonb),
    'error_code', null
  );
END;
$$;

-- Function 3: Get user's conversations
CREATE OR REPLACE FUNCTION public.get_conversations()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_conversations JSONB;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not authenticated',
      'data', null,
      'error_code', 'AUTH_REQUIRED'
    );
  END IF;
  
  -- Get conversations with participant info
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'type', c.type,
      'name', c.name,
      'created_by', c.created_by,
      'created_at', c.created_at,
      'updated_at', c.updated_at,
      'participants', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'user_id', s.user_id,
            'full_name', s.full_name,
            'role', s.role
          )
        )
        FROM public.conversation_participants cp
        JOIN public.staff_shared s ON s.user_id = cp.participant_id
        WHERE cp.conversation_id = c.id
      )
    ) ORDER BY c.updated_at DESC
  )
  INTO v_conversations
  FROM public.conversations c
  WHERE c.id IN (
    SELECT conversation_id 
    FROM public.conversation_participants 
    WHERE participant_id = v_user_id
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Conversations retrieved successfully',
    'data', COALESCE(v_conversations, '[]'::jsonb),
    'error_code', null
  );
END;
$$;
