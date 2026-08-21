#!/usr/bin/env node
/**
 * Sembrado (seed) de la plataforma Mallatex sobre PostgreSQL.
 * Inserta catálogos (matriz de acceso, conceptos NOI, líneas MES), cuentas
 * demo con secretos hasheados (scrypt) y datos de ejemplo por contexto.
 *
 *   node database/seed.js
 *
 * Cuentas demo (password: mallatex2026): admin@mallatex.mx, contabilidad@,
 * nomina@, comercial@.  Empleado demo: código MTX001 / PIN 1234.
 */
import pg from 'pg';
import { scrypt, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
async function hash(plain) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(String(plain), salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

// ---- Catálogo de módulos por superficie -----------------------------
// Grupos = áreas de la empresa; orden y etiquetas espejo de frontend/src/lib/menu.js.
const WEB_MODULES = [
  ['dashboard', 'Inicio', 'Tablero'],
  ['attendance', 'Asistencia', 'Asistencia diaria'], ['incidents', 'Asistencia', 'Incidencias'],
  ['overtime', 'Asistencia', 'Tiempo extra'], ['checador', 'Asistencia', 'Checador'],
  ['sites', 'Asistencia', 'Sitios / geocercas'],
  ['employees', 'Recursos Humanos', 'Empleados'], ['schedules', 'Recursos Humanos', 'Horarios'],
  ['rh-vacaciones', 'Recursos Humanos', 'Vacaciones'], ['rh-tickets', 'Recursos Humanos', 'Tickets RH'],
  ['rh-indicadores', 'Recursos Humanos', 'Indicadores RH'],
  ['periods', 'Nómina', 'Periodos / NOI'], ['variablepay', 'Nómina', 'Percepciones variables'],
  ['rh-recibos', 'Nómina', 'Recibos de nómina'],
  ['crm-clientes', 'Comercial', 'Clientes'], ['crm-objetivos', 'Comercial', 'Objetivos'],
  ['crm-administrativo', 'Comercial', 'Viáticos y gastos'], ['crm-facturacion', 'Comercial', 'Facturación'],
  ['products', 'Comercial', 'Catálogo de productos'],
  ['mkt-calendario', 'Marketing', 'Calendario de campañas'], ['mkt-banco', 'Marketing', 'Banco de contenido'],
  ['mkt-publicaciones', 'Marketing', 'Publicaciones'], ['mkt-formatos', 'Marketing', 'Solicitudes de formatos'],
  ['mkt-aportes', 'Marketing', 'Aportes de campo'],
  ['mkt-impresos', 'Marketing', 'Inventario de impresos'],
  ['leads-eventos', 'Eventos y Leads', 'Eventos'], ['leads-captura', 'Eventos y Leads', 'Captura de leads'],
  ['leads-sorteo', 'Eventos y Leads', 'Sorteo'], ['leads-dashboard', 'Eventos y Leads', 'Dashboard de leads'],
  ['mes-tablero', 'Producción (MES)', 'Tablero de producción'], ['mes-produccion', 'Producción (MES)', 'Jefe de producción'],
  ['mes-operaciones', 'Producción (MES)', 'Operaciones'], ['mes-almacen', 'Producción (MES)', 'Almacén'],
  ['mes-cobranza', 'Producción (MES)', 'Cobranza'], ['mes-direccion', 'Producción (MES)', 'Dirección'],
  ['mes-inventario', 'Producción (MES)', 'Inventario físico'],
  ['mes-pedidos', 'Producción (MES)', 'Pedidos (Kanban)'],
  ['users', 'Administración', 'Usuarios'], ['roles', 'Administración', 'Roles'],
  ['modulos', 'Administración', 'Módulos'], ['permisos', 'Administración', 'Permisos'],
  ['asignacion', 'Administración', 'Asignación de acceso'], ['audit', 'Administración', 'Auditoría'],
];
// Espejo del drawer móvil (mobile/App.js): jornada → labor → herramientas → admin.
const MOBILE_MODULES = [
  ['asistencia', 'Mi jornada', 'Mi asistencia'], ['historial', 'Mi jornada', 'Historial'],
  ['ruta', 'Ventas', 'Ruta'], ['clientes', 'Ventas', 'Clientes'], ['visita', 'Ventas', 'Visita'],
  ['desempeno', 'Ventas', 'Desempeño'],
  ['mes-tablet', 'Producción (MES)', 'Tablet de línea'],
  ['mes-produccion-movil', 'Producción (MES)', 'Producción'],
  ['mes-mermas', 'Producción (MES)', 'Mermas'],
  ['mes-inventario', 'Producción (MES)', 'Inventario físico'],
  ['material', 'Herramientas', 'Material de venta'],
  ['inventario', 'Herramientas', 'Inventario'], ['cotizador', 'Herramientas', 'Cotizador'],
  ['pedidos', 'Herramientas', 'Pedidos'], ['bot', 'Herramientas', 'Asesor técnico'],
  ['viaticos', 'Administración', 'Viáticos'], ['gastos', 'Administración', 'Gastos'],
  ['facturas', 'Administración', 'Facturas'],
  ['perfil', 'Cuenta', 'Perfil'],
];
const PORTAL_MODULES = [
  ['asistencia', 'Portal', 'Mi asistencia'], ['vacaciones', 'Portal', 'Vacaciones'],
  ['recibos', 'Portal', 'Recibos'], ['tickets', 'Portal', 'Tickets'],
];

// ---- Matriz de acceso por defecto -----------------------------------
const webKeys = WEB_MODULES.map((m) => m[0]);
const GRANTS = [];
const grant = (t, k, surface, mods) => mods.forEach((m) => GRANTS.push([t, k, surface, m]));
grant('role', 'admin', 'web', webKeys);
grant('role', 'contador', 'web', webKeys.filter((k) => !['users', 'roles', 'modulos', 'permisos', 'asignacion'].includes(k)));
grant('role', 'nomina', 'web', ['dashboard', 'attendance', 'incidents', 'overtime', 'periods', 'variablepay', 'rh-recibos', 'rh-vacaciones', 'rh-tickets', 'rh-indicadores', 'employees', 'schedules', 'checador', 'audit']);
grant('role', 'comercial', 'web', ['crm-clientes', 'crm-objetivos', 'crm-administrativo', 'crm-facturacion', 'products', 'mkt-banco', 'mkt-publicaciones', 'mkt-calendario']);
grant('role', 'produccion', 'web', ['mes-tablero', 'mes-produccion', 'mes-almacen', 'mes-operaciones', 'mes-inventario', 'mes-pedidos']);
grant('role', 'direccion', 'web', ['dashboard', 'mes-tablero', 'mes-direccion', 'mes-pedidos', 'rh-indicadores', 'audit']);
grant('role', 'marketing', 'web', ['mkt-banco', 'mkt-formatos', 'mkt-aportes', 'mkt-publicaciones', 'mkt-calendario', 'mkt-impresos']);
grant('profile', 'comercial', 'mobile', MOBILE_MODULES.filter((m) => !m[0].startsWith('mes-')).map((m) => m[0]));
grant('profile', 'operativo', 'mobile', ['asistencia', 'historial', 'perfil']);
grant('profile', 'linea', 'mobile', ['mes-tablet', 'mes-produccion-movil', 'mes-mermas', 'mes-inventario', 'asistencia', 'perfil']);
grant('profile', 'comercial', 'portal', PORTAL_MODULES.map((m) => m[0]));
grant('profile', 'operativo', 'portal', PORTAL_MODULES.map((m) => m[0]));
grant('profile', 'linea', 'portal', PORTAL_MODULES.map((m) => m[0]));

async function main() {
  const url = process.env.DATABASE_URL || 'postgres://mallatex:mallatex@localhost:5432/mallatex';
  const c = new pg.Client({
    connectionString: url,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
  await c.connect();
  try {
    await c.query('BEGIN');

    // Módulos + matriz
    for (const [surface, list] of [['web', WEB_MODULES], ['mobile', MOBILE_MODULES], ['portal', PORTAL_MODULES]]) {
      let i = 0;
      for (const [key, grp, label] of list) {
        await c.query(
          `INSERT INTO identity.module_catalog(key,surface,grp,label,sort) VALUES($1,$2,$3,$4,$5)
           ON CONFLICT (surface,key) DO UPDATE SET grp=EXCLUDED.grp,label=EXCLUDED.label,sort=EXCLUDED.sort`,
          [key, surface, grp, label, i++]
        );
      }
    }
    for (const [st, sk, sf, mk] of GRANTS) {
      await c.query(
        `INSERT INTO identity.access_grant(subject_type,subject_key,surface,module_key)
         VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [st, sk, sf, mk]
      );
    }

    // Usuarios admin demo
    const pass = await hash('mallatex2026');
    const users = [
      ['Administrador', 'admin@mallatex.mx', 'admin', 'Dirección de sistemas'],
      ['Contabilidad', 'contabilidad@mallatex.mx', 'contador', 'Contador general'],
      ['Nómina', 'nomina@mallatex.mx', 'nomina', 'Responsable de nómina'],
      ['Gerente Comercial', 'comercial@mallatex.mx', 'comercial', 'Gerente comercial'],
      ['Marketing', 'marketing@mallatex.mx', 'marketing', 'Coordinación de marketing'],
    ];
    for (const [name, email, role, position] of users) {
      await c.query(
        `INSERT INTO identity.users(name,email,role,position,password_hash)
         VALUES($1,$2,$3,$4,$5) ON CONFLICT (email) DO NOTHING`,
        [name, email, role, position, pass]
      );
    }

    // Horarios y sitios
    await c.query(`INSERT INTO attendance.schedules(name,entry_time,exit_time) VALUES
      ('Turno General','08:00','18:00'),('Turno Producción','07:00','15:00'),('Turno Mixto','09:00','19:00')
      ON CONFLICT DO NOTHING`);
    await c.query(`INSERT INTO attendance.devices(name,brand,model,location) VALUES
      ('Checador Principal','Hikvision','DS-K1T671','Recepción Zapopan') ON CONFLICT DO NOTHING`);
    await c.query(`INSERT INTO attendance.sites(name,client,lat,lng,radius_meters) VALUES
      ('Planta Zapopan','Mallatex',20.7214,-103.3900,200),
      ('Sucursal Ensenada','Mallatex',31.8667,-116.5964,200) ON CONFLICT DO NOTHING`);

    // Empleados demo
    const pin = await hash('1234');
    const employees = [
      ['MTX001', 'Juan Pérez', 'Producción', 'Operador', 'campo', 'operativo'],
      ['MTX002', 'Ana López', 'Ventas', 'Ejecutiva comercial', 'campo', 'comercial'],
      ['MTX013', 'Luis Ramírez', 'Logística', 'Repartidor', 'campo', 'comercial'],
      ['MTX021', 'Carlos A.', 'Producción', 'Jefe de producción', 'planta', 'linea'],
    ];
    for (const [code, name, dep, pos, mode, prof] of employees) {
      await c.query(
        `INSERT INTO attendance.employees(code,name,department,position,work_mode,app_profile,pin_hash,schedule_id,daily_salary,hire_date)
         VALUES($1,$2,$3,$4,$5,$6,$7,1,450,'2023-01-15') ON CONFLICT (code) DO NOTHING`,
        [code, name, dep, pos, mode, prof, pin]
      );
    }

    // Conceptos NOI + variables
    await c.query(`INSERT INTO attendance.noi_concepts(key,noi_number,tipo,descripcion,unidad) VALUES
      ('sueldo',1001,'P','Sueldo','dia'),('bono_puntualidad',1010,'P','Bono de puntualidad','importe'),
      ('imss',2001,'D','IMSS','importe'),('isr',2006,'D','ISR','importe')
      ON CONFLICT (key) DO NOTHING`);
    await c.query(`INSERT INTO attendance.variable_concepts(key,name,noi_number,tipo,unidad,modo,rate,source) VALUES
      ('km_conductor','Kilometraje conductor',2101,'P','km','tarifa',2.5,'g3'),
      ('costura_m2','Costura por m²',2102,'P','m2','tarifa',12,'mes'),
      ('comision_ventas','Comisión de ventas',2103,'P','%','porcentaje',3,'aspel')
      ON CONFLICT (key) DO NOTHING`);
    await c.query(`INSERT INTO attendance.periods(name,start_date,end_date,status) VALUES
      ('1ra Julio 2026','2026-07-01','2026-07-15','cerrado'),
      ('2da Julio 2026','2026-07-16','2026-07-31','abierto') ON CONFLICT DO NOTHING`);

    // CRM
    await c.query(`INSERT INTO crm.clients(name,type,contact_name,phone,cultivo,assigned_to) VALUES
      ('Agrícola El Rosario','cliente','Roberto M.','3312345678','Berries',2),
      ('Invernaderos del Valle','prospecto','Sofía R.','3387654321','Tomate',2)
      ON CONFLICT DO NOTHING`);
    await c.query(`INSERT INTO crm.products(sku,name,category,unit,price,stock) VALUES
      ('MS-35','Malla Sombra 35%','sombra','m2',18.5,12000),
      ('MA-90','Malla Antigranizo','antigranizo','m2',24,8000),
      ('MI-50','Malla Antiáfidos','antiinsecto','m2',31,5000) ON CONFLICT (sku) DO NOTHING`);
    await c.query(`INSERT INTO crm.sales_objectives(employee_id,period,target_amount,achieved_amount) VALUES
      (2,'2026-Q3',500000,180000) ON CONFLICT DO NOTHING`);

    // MES
    await c.query(`INSERT INTO mes.production_lines(code,name,type) VALUES
      ('LC1','Línea Costura 1','costura'),('LC2','Línea Costura 2','costura'),
      ('LC3','Línea Costura 3','costura'),('LC4','Línea Costura 4','costura'),
      ('LK','Línea Corte','corte'),('LP','Perforadora','perforadora'),
      ('LE','Embobinado','embobinado') ON CONFLICT (code) DO NOTHING`);
    await c.query(`INSERT INTO mes.operators(name,tipo,promedio_ml_hr,initial) VALUES
      ('Carlos A.','D',420,'CA'),('Miguel S.','B',280,'MS'),('José R.','A',210,'JR')
      ON CONFLICT DO NOTHING`);
    await c.query(`INSERT INTO mes.production_orders(code,cliente,material,medida,rollos,estado,pago_confirmado,fecha_pedido,compromiso) VALUES
      ('EZE503','Driscolls','Malla Sombra','4.20x100',2900,'en-produccion',true,'2026-07-10','2026-08-20'),
      ('FEL220','Berries del Sol','Antigranizo','5.00x100',180,'cobranza-pendiente',false,'2026-07-28','2026-08-15')
      ON CONFLICT (code) DO NOTHING`);
    await c.query(`INSERT INTO mes.production_suborders(order_id,name,rollos) VALUES
      (1,'Egipto',700),(1,'San Francisco',600),(1,'Atenco',600),(1,'San José',500),(1,'Cabaña',500)
      ON CONFLICT DO NOTHING`);

    // Leads (Anaberries)
    await c.query(`INSERT INTO leads.events(name,edition,premio,fecha,lugar,activo) VALUES
      ('Expo Agroalimentaria 2026','XXXI','Kit de malla sombra','2026-11-10','Irapuato, Gto.',true)
      ON CONFLICT DO NOTHING`);
    await c.query(`INSERT INTO leads.leads(event_id,folio,nombre,empresa,estado,email,telefono,interes,consentimiento,fuente,metodo_captura) VALUES
      (1,'ANB-1A2B3C','María Fernández','Agro MF','Jalisco','maria@agromf.mx','3311122233','malla_sombra',true,'Stand','manual')
      ON CONFLICT DO NOTHING`);

    // Marketing: campaña vigente, publicación e inventario de impresos demo
    await c.query(`INSERT INTO marketing.campaigns(nombre,descripcion,color,canal,fecha_inicio,fecha_fin,productos,estado,created_by) VALUES
      ('Antigranizo temporada alta','Empuje de malla antigranizo previo a tormentas','#ED3237','mixto','2026-07-01','2026-10-31','["MA-90"]','vigente','Marketing'),
      ('Sombra primavera','Malla sombra para hortaliza','#B45309','redes','2027-02-01','2027-05-31','["MS-35"]','planeada','Marketing')
      ON CONFLICT DO NOTHING`);
    // Banco de contenido: assets de ejemplo (logos reales del repo si están
    // disponibles; si no, un PNG mínimo para que la galería no quede vacía).
    const TINY_PNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    const logoBlob = (name) => {
      try {
        return readFileSync(new URL(`../frontend/public/logos/${name}`, import.meta.url));
      } catch {
        return TINY_PNG;
      }
    };
    const demoAssets = [
      ['Logotipo Mallatex (horizontal)', 'logos', null, logoBlob('mallatex-full.png')],
      ['Símbolo Mallatex', 'logos', null, logoBlob('mallatex-symbol.png')],
      ['Ficha técnica malla antigranizo', 'fichas', 'MA-90', logoBlob('mallatex-full.png')],
    ];
    for (const [titulo, categoria, sku, blob] of demoAssets) {
      await c.query(
        `INSERT INTO marketing.assets(tipo,titulo,categoria,product_sku,mime,size_bytes,storage,blob,uploaded_by)
         SELECT 'imagen',$1,$2,$3,'image/png',$4,'db',$5,'Marketing'
         WHERE NOT EXISTS (SELECT 1 FROM marketing.assets WHERE titulo=$1)`,
        [titulo, categoria, sku, blob.length, blob]
      );
    }
    await c.query(`INSERT INTO marketing.posts(titulo,copy_texto,red,campaign_id,publicado_por) VALUES
      ('Protege tu cosecha del granizo','La malla antigranizo Mallatex resiste hasta... #ProtegemosLoQueSiembras','whatsapp',1,'Marketing')
      ON CONFLICT DO NOTHING`);
    await c.query(`INSERT INTO marketing.print_items(nombre,categoria,unidad,minimo,notas) VALUES
      ('Muestrario de mallas 2026','muestrario','pieza',5,'Carpeta física con muestras de tejido'),
      ('Tarjetas de presentación','tarjeta','caja',3,'Cajas de 100 tarjetas'),
      ('Carpeta corporativa','carpeta','pieza',20,NULL)
      ON CONFLICT DO NOTHING`);
    await c.query(`INSERT INTO marketing.print_movements(item_id,tipo,cantidad,persona,motivo,created_by) VALUES
      (1,'entrada',12,'Imprenta GDL','Producción inicial','Marketing'),
      (2,'entrada',10,'Imprenta GDL','Reimpresión','Marketing'),
      (1,'salida',2,'Ana López','Gira Bajío','Marketing')
      ON CONFLICT DO NOTHING`);

    await c.query('COMMIT');
    console.log('✓ Seed completado (usuarios, matriz de acceso, catálogos y datos demo)');
  } catch (e) {
    await c.query('ROLLBACK');
    console.error('Error en seed:', e.message);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
}

main();
