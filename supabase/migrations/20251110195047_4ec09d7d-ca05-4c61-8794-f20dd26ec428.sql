-- Add DELETE policy for admins and gestors
CREATE POLICY "Admins and gestors can delete leads"
ON public.fifty_scripts_leads
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gestor'::app_role)
);

-- Function to remove duplicate leads, keeping the oldest one
CREATE OR REPLACE FUNCTION public.remove_duplicate_leads()
RETURNS TABLE (
  duplicates_removed integer,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed_count integer := 0;
  duplicate_info jsonb := '[]'::jsonb;
  duplicate_record record;
BEGIN
  -- Find and remove duplicates based on email
  FOR duplicate_record IN
    SELECT 
      email,
      array_agg(id ORDER BY created_at) as ids,
      count(*) as count
    FROM fifty_scripts_leads
    WHERE email IS NOT NULL AND email != ''
    GROUP BY email
    HAVING count(*) > 1
  LOOP
    -- Keep the first (oldest) and delete the rest
    DELETE FROM fifty_scripts_leads
    WHERE id = ANY(duplicate_record.ids[2:]);
    
    removed_count := removed_count + (duplicate_record.count - 1);
    duplicate_info := duplicate_info || jsonb_build_object(
      'email', duplicate_record.email,
      'removed', duplicate_record.count - 1
    );
  END LOOP;

  -- Find and remove duplicates based on phone
  FOR duplicate_record IN
    SELECT 
      phone,
      array_agg(id ORDER BY created_at) as ids,
      count(*) as count
    FROM fifty_scripts_leads
    WHERE phone IS NOT NULL AND phone != ''
    GROUP BY phone
    HAVING count(*) > 1
  LOOP
    -- Keep the first (oldest) and delete the rest
    DELETE FROM fifty_scripts_leads
    WHERE id = ANY(duplicate_record.ids[2:]);
    
    removed_count := removed_count + (duplicate_record.count - 1);
    duplicate_info := duplicate_info || jsonb_build_object(
      'phone', duplicate_record.phone,
      'removed', duplicate_record.count - 1
    );
  END LOOP;

  RETURN QUERY SELECT removed_count, duplicate_info;
END;
$$;