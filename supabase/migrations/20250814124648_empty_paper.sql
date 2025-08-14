@@ .. @@
 -- Criar função para verificar se usuário é funcionário do restaurante
 CREATE OR REPLACE FUNCTION is_restaurant_employee(restaurant_id uuid, user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 AS $$
 BEGIN
   RETURN EXISTS (
     SELECT 1 FROM employees e
-    WHERE e.auth_user_id = user_id
-      AND e.restaurant_id = restaurant_id
+    WHERE e.auth_user_id = is_restaurant_employee.user_id
+      AND e.restaurant_id = is_restaurant_employee.restaurant_id
       AND e.active = true
   );
 END;
 $$;