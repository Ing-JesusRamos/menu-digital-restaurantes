BEGIN;

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY,
  display_name text NOT NULL,
  identification_type text,
  identification_value text,
  phone text,
  status text DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text
);

CREATE TABLE IF NOT EXISTS platform_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  role_id uuid NOT NULL REFERENCES platform_roles(id) ON DELETE RESTRICT,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT platform_role_assignments_user_role_unique UNIQUE(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS platform_role_permissions (
  role_id uuid NOT NULL REFERENCES platform_roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  CONSTRAINT platform_role_permissions_unique UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS restaurant_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE RESTRICT,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
  role text NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS administrative_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  requested_by_user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  reviewed_by_user_id uuid REFERENCES user_profiles(id) ON DELETE RESTRICT,
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE RESTRICT,
  target_user_id uuid REFERENCES user_profiles(id) ON DELETE RESTRICT,
  payload jsonb,
  reason text,
  reviewed_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES user_profiles(id) ON DELETE RESTRICT,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE RESTRICT,
  before jsonb,
  after jsonb,
  reason text,
  confirmation_method text,
  request_id text,
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS support_elevations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  superadmin_user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
  scope jsonb NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'active' NOT NULL,
  approved_at timestamptz,
  expires_at timestamptz NOT NULL,
  closed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' NOT NULL;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS deletion_eligible_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source text DEFAULT 'client' NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS current_version integer DEFAULT 1 NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_restaurant_id_restaurants_id_fk') THEN
    ALTER TABLE orders DROP CONSTRAINT orders_restaurant_id_restaurants_id_fk;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_restaurant_id_restaurants_id_fk_restrict') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_restaurant_id_restaurants_id_fk_restrict
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS order_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  version integer NOT NULL,
  items jsonb NOT NULL,
  total_cents integer NOT NULL,
  created_by_user_id uuid REFERENCES user_profiles(id) ON DELETE RESTRICT,
  confirmation_method text,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT order_versions_order_version_unique UNIQUE(order_id, version)
);

CREATE TABLE IF NOT EXISTS order_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  requested_by_user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  target_version integer NOT NULL,
  proposed_items jsonb NOT NULL,
  proposed_total_cents integer NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  confirmation_method text,
  reason text,
  created_at timestamptz DEFAULT now() NOT NULL,
  confirmed_at timestamptz
);

COMMIT;
