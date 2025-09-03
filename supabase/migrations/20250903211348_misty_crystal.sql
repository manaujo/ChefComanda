@@ .. @@
 CREATE OR REPLACE FUNCTION get_plan_from_price_id(price_id text)
 RETURNS text AS $$
 BEGIN
-  CASE price_id
-    WHEN 'price_test_basico_monthly' THEN RETURN 'basico';
-    WHEN 'price_test_basico_annual' THEN RETURN 'basico_annual';
-    WHEN 'price_test_starter_annual' THEN RETURN 'starter_annual';
+  RETURN CASE price_id
+    WHEN 'price_1OYxkqLkdIwHu7ixraBm864y' THEN 'basico'
+    WHEN 'price_1OYxkqLkdIwHu7ix4f6nFx1x' THEN 'basico_annual'
+    WHEN 'price_1OYxkqLkdIwHu7ixYcRkHvKr' THEN 'starter_annual'
     ELSE 'free'
-  END CASE;
+  END;
 END;
 $$ LANGUAGE plpgsql;