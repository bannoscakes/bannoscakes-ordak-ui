-- Drop test/debug functions that should never exist in production
-- These expose security risks and serve no production purpose
-- Issue: https://github.com/bannoscakes/bannoscakes-ordak-ui/issues/532

DROP FUNCTION IF EXISTS public.test_auth();
DROP FUNCTION IF EXISTS public.test_rpc_call();
DROP FUNCTION IF EXISTS public.get_messages_debug();
DROP FUNCTION IF EXISTS public.get_messages_temp_test();
