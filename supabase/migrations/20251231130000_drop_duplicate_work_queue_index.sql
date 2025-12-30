-- Drop duplicate index on work_queue table
-- work_queue_status_topic_created_idx2 is a duplicate of work_queue_status_topic_created_idx
-- Identified by Supabase Performance Advisor

DROP INDEX IF EXISTS work_queue_status_topic_created_idx2;
