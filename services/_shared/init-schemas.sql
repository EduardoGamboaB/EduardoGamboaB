-- Crea los 4 schemas separados (uno por microservicio) en la misma BD.
-- Permite que cada servicio tenga su namespace sin pelearse por tablas
-- y conserva la simplicidad de una sola instancia Postgres en local.
CREATE SCHEMA IF NOT EXISTS orders;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS production;
CREATE SCHEMA IF NOT EXISTS identity;

GRANT ALL ON SCHEMA orders     TO mes;
GRANT ALL ON SCHEMA inventory  TO mes;
GRANT ALL ON SCHEMA production TO mes;
GRANT ALL ON SCHEMA identity   TO mes;
